import { Injectable, inject } from '@angular/core';
import { PreferencesService } from '../preferences/preferences.service';
import { CollectedRewardsService } from '../drops/collected-rewards.service';
import { AuthService, SUPABASE_AUTH_CLIENT } from './auth.service';
import { LocalTrackerSnapshot, RemoteTrackerSnapshot, SyncResult, TrackerCollectedReward, TrackerFavorite, TrackerIgnoredGame } from './tracker-sync.models';

function isNewer(left: string, right: string): boolean {
  return Date.parse(left) > Date.parse(right);
}

function mergeActiveRows<T extends { updatedAt: string }>(
  localRows: readonly T[],
  remoteRows: readonly T[],
  keyFor: (row: T) => string,
  tombstoneFor: (row: T) => string | null | undefined,
): readonly T[] {
  const activeRows = new Map<string, T>();
  const tombstones = new Map<string, string>();

  for (const row of [...localRows, ...remoteRows]) {
    const key = keyFor(row);
    const tombstone = tombstoneFor(row);
    if (tombstone) {
      const currentTombstone = tombstones.get(key);
      if (!currentTombstone || isNewer(tombstone, currentTombstone)) tombstones.set(key, tombstone);
    }
    const current = activeRows.get(key);
    if (!current || isNewer(row.updatedAt, current.updatedAt)) activeRows.set(key, row);
  }

  return [...activeRows.values()]
    .filter((row) => !isNewer(tombstones.get(keyFor(row)) ?? row.updatedAt, row.updatedAt))
    .sort((left, right) => keyFor(left).localeCompare(keyFor(right)));
}

export function mergeTrackerSnapshots(local: LocalTrackerSnapshot, remote: RemoteTrackerSnapshot): LocalTrackerSnapshot {
  const settings = !remote.settings || isNewer(local.settings.updatedAt, remote.settings.updatedAt)
    ? local.settings
    : remote.settings;

  return {
    settings,
    favorites: mergeActiveRows<TrackerFavorite>(local.favorites, remote.favorites, (row) => row.gameId, (row) => row.removedAt),
    ignoredGames: mergeActiveRows<TrackerIgnoredGame>(local.ignoredGames, remote.ignoredGames, (row) => row.gameId, (row) => row.removedAt),
    collectedRewards: mergeActiveRows<TrackerCollectedReward>(local.collectedRewards, remote.collectedRewards, (row) => `${row.campaignId}\u0000${row.rewardName}`, (row) => row.clearedAt),
  };
}

@Injectable({ providedIn: 'root' })
export class TrackerSyncService {
  private readonly auth = inject(AuthService);
  private readonly client = inject(SUPABASE_AUTH_CLIENT);
  private readonly preferences = inject(PreferencesService);
  private readonly collectedRewards = inject(CollectedRewardsService);

  async syncAfterAuthentication(): Promise<SyncResult> {
    const user = this.auth.user();
    if (!user) return { status: 'skipped' };

    const local = this.localSnapshot();
    try {
      const merged = mergeTrackerSnapshots(local, await this.readRemote(user.id));
      await this.writeRemote(user.id, merged);
      this.applyLocalSnapshot(merged);
      return { status: 'synced' };
    } catch {
      return { status: 'error', message: 'Your tracker stays on this device until it can sync again.' };
    }
  }

  async syncLocalChange(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    try {
      await this.writeRemote(user.id, this.localSnapshot());
    } catch {
      // Local storage remains the source of truth until the next successful sync.
    }
  }

  private localSnapshot(): LocalTrackerSnapshot {
    const updatedAt = new Date().toISOString();
    return {
      settings: this.preferences.trackerSettings(),
      favorites: this.preferences.trackerFavorites(updatedAt),
      ignoredGames: this.preferences.trackerIgnoredGames(updatedAt),
      collectedRewards: this.collectedRewards.trackerCollectedRewards(updatedAt),
    };
  }

  private applyLocalSnapshot(snapshot: LocalTrackerSnapshot): void {
    this.preferences.applyTrackerSettings(snapshot.settings);
    this.preferences.replaceLists(
      snapshot.favorites.map((favorite) => ({ id: favorite.gameId, gameName: favorite.gameName ?? undefined })),
      snapshot.ignoredGames.map((game) => ({ id: game.gameId, gameName: game.gameName ?? game.gameId, blacklistedAt: game.updatedAt })),
    );
    this.collectedRewards.applyTrackerCollectedRewards(snapshot.collectedRewards);
  }

  private async readRemote(userId: string): Promise<RemoteTrackerSnapshot> {
    const [settings, favorites, ignoredGames, collectedRewards] = await Promise.all([
      this.select('user_settings', userId),
      this.select('user_favorite_games', userId),
      this.select('user_ignored_games', userId),
      this.select('user_collected_rewards', userId),
    ]);
    const setting = settings[0] as Record<string, unknown> | undefined;
    return {
      settings: setting ? {
        themeColor: setting['theme_color'] as LocalTrackerSnapshot['settings']['themeColor'],
        showSubscriptions: setting['show_subscriptions'] === true,
        showBadges: setting['show_badges'] === true,
        updatedAt: String(setting['updated_at']),
      } : null,
      favorites: favorites.map((row) => ({ gameId: String(row['game_id']), gameName: asOptionalString(row['game_name']), updatedAt: String(row['updated_at']), removedAt: asOptionalString(row['removed_at']) })),
      ignoredGames: ignoredGames.map((row) => ({ gameId: String(row['game_id']), gameName: asOptionalString(row['game_name']), updatedAt: String(row['updated_at']), removedAt: asOptionalString(row['removed_at']) })),
      collectedRewards: collectedRewards.map((row) => ({ campaignId: String(row['campaign_id']), rewardName: String(row['reward_name']), updatedAt: String(row['updated_at']), clearedAt: asOptionalString(row['cleared_at']) })),
    };
  }

  private async select(table: string, userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.client.from(table).select('*').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  }

  private async writeRemote(userId: string, snapshot: LocalTrackerSnapshot): Promise<void> {
    await this.upsert('user_settings', {
      user_id: userId,
      theme_color: snapshot.settings.themeColor,
      show_subscriptions: snapshot.settings.showSubscriptions,
      show_badges: snapshot.settings.showBadges,
      updated_at: snapshot.settings.updatedAt,
    });
    await this.upsertRows('user_favorite_games', snapshot.favorites.map((row) => ({ user_id: userId, game_id: row.gameId, game_name: row.gameName ?? row.gameId, removed_at: row.removedAt ?? null, updated_at: row.updatedAt })));
    await this.upsertRows('user_ignored_games', snapshot.ignoredGames.map((row) => ({ user_id: userId, game_id: row.gameId, game_name: row.gameName ?? row.gameId, removed_at: row.removedAt ?? null, updated_at: row.updatedAt })));
    await this.upsertRows('user_collected_rewards', snapshot.collectedRewards.map((row) => ({ user_id: userId, campaign_id: row.campaignId, reward_name: row.rewardName, cleared_at: row.clearedAt ?? null, updated_at: row.updatedAt })));
  }

  private async upsert(table: string, row: Record<string, unknown>): Promise<void> {
    const { error } = await this.client.from(table).upsert(row);
    if (error) throw error;
  }

  private async upsertRows(table: string, rows: readonly Record<string, unknown>[]): Promise<void> {
    if (rows.length) await this.upsert(table, rows as unknown as Record<string, unknown>);
  }
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
