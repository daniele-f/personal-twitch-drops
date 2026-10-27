import { Injectable, inject, signal } from '@angular/core';
import { PreferencesService } from '../preferences/preferences.service';
import { CollectedRewardsService } from '../drops/collected-rewards.service';
import { AuthService, SUPABASE_AUTH_CLIENT } from './auth.service';
import { LocalTrackerSnapshot, RemoteTrackerSnapshot, SyncResult, TrackerCollectedReward, TrackerFavorite, TrackerIgnoredGame } from './tracker-sync.models';
import { TrackerMutation } from './tracker-mutation';
import { TrackerMutationDispatcherService } from './tracker-mutation-dispatcher.service';
import { TrackerMutationQueueService } from './tracker-mutation-queue.service';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { TrackerReconciliation, TrackerSyncStatus } from './tracker-sync.models';

const LINKED_ACCOUNT_STORAGE_KEY = 'personal-twitch-drops.tracker-sync-link.v1';

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
      const deletionTime = isNewer(row.updatedAt, tombstone) ? row.updatedAt : tombstone;
      if (!currentTombstone || isNewer(deletionTime, currentTombstone)) tombstones.set(key, deletionTime);
      continue;
    }
    const current = activeRows.get(key);
    if (!current || isNewer(row.updatedAt, current.updatedAt)) activeRows.set(key, row);
  }

  return [...activeRows.values()]
    .filter((row) => {
      const deletionTime = tombstones.get(keyFor(row));
      return !deletionTime || isNewer(row.updatedAt, deletionTime);
    })
    .sort((left, right) => keyFor(left).localeCompare(keyFor(right)));
}

function resolvePreferenceConflicts(
  favorites: readonly TrackerFavorite[],
  ignoredGames: readonly TrackerIgnoredGame[],
): { favorites: readonly TrackerFavorite[]; ignoredGames: readonly TrackerIgnoredGame[] } {
  const resolvedFavorites = new Map(favorites.map((favorite) => [favorite.gameId, favorite]));
  const resolvedIgnoredGames = new Map(ignoredGames.map((game) => [game.gameId, game]));
  const resolvedAt = new Date().toISOString();

  for (const [gameId, favorite] of resolvedFavorites) {
    const ignoredGame = resolvedIgnoredGames.get(gameId);
    if (!ignoredGame) continue;

    if (isNewer(favorite.updatedAt, ignoredGame.updatedAt)) {
      resolvedIgnoredGames.set(gameId, { ...ignoredGame, removedAt: resolvedAt });
    } else {
      resolvedFavorites.set(gameId, { ...favorite, removedAt: resolvedAt });
    }
  }

  return {
    favorites: [...resolvedFavorites.values()].sort((left, right) => left.gameId.localeCompare(right.gameId)),
    ignoredGames: [...resolvedIgnoredGames.values()].sort((left, right) => left.gameId.localeCompare(right.gameId)),
  };
}

export function mergeTrackerSnapshots(local: LocalTrackerSnapshot, remote: RemoteTrackerSnapshot): LocalTrackerSnapshot {
  const settings = !remote.settings || isNewer(local.settings.updatedAt, remote.settings.updatedAt)
    ? local.settings
    : remote.settings;

  const preferences = resolvePreferenceConflicts(
    mergeActiveRows<TrackerFavorite>(local.favorites, remote.favorites, (row) => row.gameId, (row) => row.removedAt),
    mergeActiveRows<TrackerIgnoredGame>(local.ignoredGames, remote.ignoredGames, (row) => row.gameId, (row) => row.removedAt),
  );

  return {
    settings,
    favorites: preferences.favorites,
    ignoredGames: preferences.ignoredGames,
    collectedRewards: mergeActiveRows<TrackerCollectedReward>(local.collectedRewards, remote.collectedRewards, (row) => `${row.campaignId}\u0000${row.rewardName}`, (row) => row.clearedAt),
  };
}

@Injectable({ providedIn: 'root' })
export class TrackerSyncService {
  private readonly auth = inject(AuthService);
  private readonly client = inject(SUPABASE_AUTH_CLIENT);
  private readonly preferences = inject(PreferencesService);
  private readonly collectedRewards = inject(CollectedRewardsService);
  private readonly mutationDispatcher = inject(TrackerMutationDispatcherService);
  private readonly mutationQueue = inject(TrackerMutationQueueService);
  private readonly storage = inject(PREFERENCES_STORAGE);
  private lastSyncedSnapshot: LocalTrackerSnapshot | null = null;
  readonly readyForLocalChanges = signal(false);
  readonly status = signal<TrackerSyncStatus>('idle');
  readonly summary = signal<string | null>(null);
  readonly reconciliation = signal<TrackerReconciliation | null>(null);

  async syncAfterAuthentication(): Promise<SyncResult> {
    const user = this.auth.user();
    if (!user) return { status: 'skipped' };

    this.readyForLocalChanges.set(false);
    this.status.set('syncing');
    this.summary.set(null);
    this.reconciliation.set(null);
    let local!: LocalTrackerSnapshot;
    try {
      let remote = await this.readRemote(user.id);
      local = this.localSnapshot();
      if (this.mutationQueue.loadForAccount(user.id).length) {
        await this.replayQueuedMutations(user.id);
        remote = await this.readRemote(user.id);
      }
      const account = this.snapshotFromRemote(remote, local);
      const browserHasData = !this.isProfileEmpty(local);
      const accountHasData = !this.isProfileEmpty(account);
      if (this.profilesEqual(local, account)) {
        this.adoptAccountSnapshot(remote, local);
        this.rememberLinkedAccount(user.id);
        return { status: 'synced' };
      }
      if (!accountHasData && browserHasData) {
        await this.importInitialSnapshot(local, false);
        this.lastSyncedSnapshot = local;
        this.rememberLinkedAccount(user.id);
        this.readyForLocalChanges.set(true);
        this.status.set('idle');
        return { status: 'synced' };
      }
      if (accountHasData && !browserHasData) {
        this.adoptAccountSnapshot(remote, local);
        this.rememberLinkedAccount(user.id);
        return { status: 'synced' };
      }
      if (browserHasData && accountHasData) {
        const browserPreferenceCount = this.preferenceCount(local);
        const accountPreferenceCount = this.preferenceCount(remote);
        this.status.set('needs-reconciliation');
        this.reconciliation.set({ accountId: user.id, browserPreferenceCount, accountPreferenceCount, differences: this.profileDifferences(local, account) });
        return { status: 'skipped' };
      }
      this.lastSyncedSnapshot = local;
      this.rememberLinkedAccount(user.id);
      this.readyForLocalChanges.set(true);
      this.status.set('idle');
      return { status: 'synced' };
    } catch {
      this.status.set('error');
      return { status: 'error', message: 'Your tracker stays on this device until it can sync again.' };
    }
  }

  async chooseInitialSource(source: 'browser' | 'account'): Promise<SyncResult> {
    const user = this.auth.user();
    const reconciliation = this.reconciliation();
    if (!user || !reconciliation || reconciliation.accountId !== user.id) return { status: 'skipped' };

    this.status.set('syncing');
    try {
      const local = this.localSnapshot();
      if (source === 'browser') {
        await this.importInitialSnapshot(local, reconciliation.accountPreferenceCount > 0);
        this.lastSyncedSnapshot = local;
      } else {
        this.mutationDispatcher.clearRecorded();
        this.mutationQueue.clearForAccount(user.id);
        this.adoptAccountSnapshot(await this.readRemote(user.id), local);
      }
      if (source === 'browser') this.mutationDispatcher.clearRecorded();
      this.rememberLinkedAccount(user.id);
      this.reconciliation.set(null);
      this.readyForLocalChanges.set(true);
      this.status.set('idle');
      await this.replayQueuedMutations(user.id);
      return { status: 'synced' };
    } catch {
      this.status.set('error');
      return { status: 'error', message: 'Your preference choice could not be synchronized. Please try again.' };
    }
  }

  async syncLocalChange(): Promise<void> {
    const user = this.auth.user();
    if (!user || !this.lastSyncedSnapshot) return;
    for (const mutation of this.mutationDispatcher.drain()) this.mutationQueue.enqueue(user.id, mutation);
    try {
      await this.replayQueuedMutations(user.id);
    } catch {
      this.status.set('pending-retry');
    }
  }

  async retryPending(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    this.status.set('syncing');
    try { await this.replayQueuedMutations(user.id); }
    catch { this.status.set('pending-retry'); }
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
      snapshot.favorites.filter((favorite) => !favorite.removedAt).map((favorite) => ({ id: favorite.gameId, gameName: favorite.gameName ?? undefined })),
      snapshot.ignoredGames.filter((game) => !game.removedAt).map((game) => ({ id: game.gameId, gameName: game.gameName ?? game.gameId, blacklistedAt: game.updatedAt })), 'sync',
    );
    this.collectedRewards.applyTrackerCollectedRewards(snapshot.collectedRewards);
  }

  private async readRemote(userId: string): Promise<RemoteTrackerSnapshot> {
    const [settings, favorites, ignoredGames, collectedRewards] = await Promise.all([
      this.selectSettings(userId),
      this.select('user_favorite_games', userId),
      this.select('user_ignored_games', userId),
      this.select('user_collected_rewards', userId),
    ]);
    const setting = settings[0] as Record<string, unknown> | undefined;
    return {
      settings: setting ? {
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

  private async selectSettings(userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.client.from('user_settings').select('show_subscriptions,show_badges,updated_at').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  }

  private async writeRemote(userId: string, snapshot: LocalTrackerSnapshot): Promise<void> {
    await this.upsert('user_settings', {
      user_id: userId,
      show_subscriptions: snapshot.settings.showSubscriptions,
      show_badges: snapshot.settings.showBadges,
      updated_at: snapshot.settings.updatedAt,
    });
    await this.upsertRows('user_favorite_games', snapshot.favorites.map((row) => ({ user_id: userId, game_id: row.gameId, game_name: row.gameName ?? row.gameId, removed_at: row.removedAt ?? null, updated_at: row.updatedAt })));
    await this.upsertRows('user_ignored_games', snapshot.ignoredGames.map((row) => ({ user_id: userId, game_id: row.gameId, game_name: row.gameName ?? row.gameId, removed_at: row.removedAt ?? null, updated_at: row.updatedAt })));
    await this.upsertRows('user_collected_rewards', snapshot.collectedRewards.map((row) => ({ user_id: userId, campaign_id: row.campaignId, reward_name: row.rewardName, cleared_at: row.clearedAt ?? null, updated_at: row.updatedAt })));
  }

  private async applyMutation(mutation: TrackerMutation): Promise<void> {
    let result: { error: unknown };
    if (mutation.type === 'favorite' || mutation.type === 'ignore') result = await this.client.rpc('apply_tracker_game_preference', { p_action: mutation.type, p_game_id: mutation.gameId, p_game_name: mutation.gameName });
    else if (mutation.type === 'unfavorite' || mutation.type === 'unignore') result = await this.client.rpc('apply_tracker_game_preference', { p_action: mutation.type, p_game_id: mutation.gameId });
    else if (mutation.type === 'settings') result = await this.client.rpc('set_tracker_settings', { p_theme_color: this.preferences.themeColor(), p_show_subscriptions: mutation.showSubscriptions, p_show_badges: mutation.showBadges });
    else if (mutation.type === 'set-collected') result = await this.client.rpc('set_tracker_reward', { p_campaign_id: mutation.campaignId, p_reward_name: mutation.rewardName, p_collected: mutation.collected });
    else {
      const unsupported: never = mutation;
      throw new Error(`Unsupported tracker mutation: ${JSON.stringify(unsupported)}`);
    }
    if (result.error) throw result.error;
  }

  private async importInitialSnapshot(snapshot: LocalTrackerSnapshot, replaceExisting = false): Promise<void> {
    const { error } = await this.client.rpc('import_tracker_preferences', { p_snapshot: snapshot, p_replace_existing: replaceExisting });
    if (error) throw error;
  }

  private async replayQueuedMutations(userId: string): Promise<void> {
    const entries = this.mutationQueue.loadForAccount(userId);
    for (const entry of entries) {
      await this.applyMutation(entry.mutation);
      this.mutationQueue.removeThrough(userId, entry.sequence);
    }
    const remote = await this.readRemote(userId);
    this.lastSyncedSnapshot = this.snapshotFromRemote(remote, this.localSnapshot());
    this.readyForLocalChanges.set(true);
    this.status.set('idle');
  }

  private adoptAccountSnapshot(remote: RemoteTrackerSnapshot, local: LocalTrackerSnapshot): void {
    const snapshot = this.snapshotFromRemote(remote, local);
    this.applyLocalSnapshot(snapshot);
    this.lastSyncedSnapshot = snapshot;
    this.readyForLocalChanges.set(true);
    this.status.set('idle');
  }

  private snapshotFromRemote(remote: RemoteTrackerSnapshot, fallback: LocalTrackerSnapshot): LocalTrackerSnapshot {
    return { ...fallback, settings: remote.settings ?? fallback.settings, favorites: remote.favorites, ignoredGames: remote.ignoredGames, collectedRewards: remote.collectedRewards };
  }

  private preferenceCount(snapshot: Pick<RemoteTrackerSnapshot, 'favorites' | 'ignoredGames' | 'collectedRewards'>): number {
    return snapshot.favorites.filter((row) => !row.removedAt).length
      + snapshot.ignoredGames.filter((row) => !row.removedAt).length
      + snapshot.collectedRewards.filter((row) => !row.clearedAt).length;
  }

  private isProfileEmpty(snapshot: LocalTrackerSnapshot): boolean {
    return !snapshot.settings.showSubscriptions && !snapshot.settings.showBadges
      && snapshot.favorites.every((row) => !!row.removedAt)
      && snapshot.ignoredGames.every((row) => !!row.removedAt)
      && snapshot.collectedRewards.every((row) => !!row.clearedAt);
  }

  private profilesEqual(left: LocalTrackerSnapshot, right: LocalTrackerSnapshot): boolean {
    const profile = (snapshot: LocalTrackerSnapshot) => JSON.stringify({
      settings: { showSubscriptions: snapshot.settings.showSubscriptions, showBadges: snapshot.settings.showBadges },
      favorites: snapshot.favorites.filter((row) => !row.removedAt).map((row) => [row.gameId, row.gameName]).sort(),
      ignoredGames: snapshot.ignoredGames.filter((row) => !row.removedAt).map((row) => [row.gameId, row.gameName]).sort(),
      collectedRewards: snapshot.collectedRewards.filter((row) => !row.clearedAt).map((row) => [row.campaignId, row.rewardName]).sort(),
    });
    return profile(left) === profile(right);
  }

  private profileDifferences(browser: LocalTrackerSnapshot, account: LocalTrackerSnapshot): readonly string[] {
    const active = <T extends { removedAt?: string | null; clearedAt?: string | null }>(rows: readonly T[], key: (row: T) => string) =>
      new Set(rows.filter((row) => !row.removedAt && !row.clearedAt).map(key));
    const differences: string[] = [];
    if (browser.settings.showSubscriptions !== account.settings.showSubscriptions || browser.settings.showBadges !== account.settings.showBadges) differences.push('Display settings');
    const append = <T extends { removedAt?: string | null; clearedAt?: string | null }>(label: string, localRows: readonly T[], accountRows: readonly T[], key: (row: T) => string) => {
      const local = active(localRows, key); const remote = active(accountRows, key);
      const onlyBrowser = [...local].filter((value) => !remote.has(value)); const onlyAccount = [...remote].filter((value) => !local.has(value));
      if (onlyBrowser.length || onlyAccount.length) differences.push(`${label}: ${onlyBrowser.length} only in this browser, ${onlyAccount.length} only in your account`);
    };
    append('Favorites', browser.favorites, account.favorites, (row) => row.gameId);
    append('Ignored games', browser.ignoredGames, account.ignoredGames, (row) => row.gameId);
    append('Collected rewards', browser.collectedRewards, account.collectedRewards, (row) => `${row.campaignId}: ${row.rewardName}`);
    return differences;
  }

  private linkedAccountId(): string | null {
    try {
      const parsed: unknown = JSON.parse(this.storage?.getItem(LINKED_ACCOUNT_STORAGE_KEY) ?? 'null');
      return parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>)['accountId'] === 'string'
        ? (parsed as Record<string, unknown>)['accountId'] as string : null;
    } catch { return null; }
  }

  private rememberLinkedAccount(accountId: string): void {
    try { this.storage?.setItem(LINKED_ACCOUNT_STORAGE_KEY, JSON.stringify({ accountId })); } catch { /* Link metadata is optional. */ }
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
