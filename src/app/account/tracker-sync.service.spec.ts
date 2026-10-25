import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService, SUPABASE_AUTH_CLIENT } from './auth.service';
import { CollectedRewardsService } from '../drops/collected-rewards.service';
import { PREFERENCES_STORAGE, THEME_COLOR_STORAGE_KEY } from '../preferences/preferences-storage';
import { PreferencesService } from '../preferences/preferences.service';
import { mergeTrackerSnapshots, TrackerSyncService } from './tracker-sync.service';
import { LocalTrackerSnapshot } from './tracker-sync.models';

const local: LocalTrackerSnapshot = {
  settings: { showSubscriptions: false, showBadges: false, updatedAt: '2026-10-18T12:00:00.000Z' },
  favorites: [{ gameId: '/game/local', gameName: 'Local game', updatedAt: '2026-10-18T12:00:00.000Z' }],
  ignoredGames: [{ gameId: '/game/ignored-local', gameName: 'Ignored local game', updatedAt: '2026-10-18T12:00:00.000Z' }],
  collectedRewards: [{ campaignId: '/campaign/local', rewardName: 'Local reward', updatedAt: '2026-10-18T12:00:00.000Z' }],
};

describe('mergeTrackerSnapshots', () => {
  it('unions tracker collections, chooses the newest settings, and excludes snapshots', () => {
    const merged = mergeTrackerSnapshots(local, {
      settings: { showSubscriptions: true, showBadges: true, updatedAt: '2026-10-18T13:00:00.000Z' },
      favorites: [{ gameId: '/game/remote', gameName: 'Remote game', updatedAt: '2026-10-18T13:00:00.000Z' }],
      ignoredGames: [{ gameId: '/game/ignored-remote', gameName: 'Ignored remote game', updatedAt: '2026-10-18T13:00:00.000Z' }],
      collectedRewards: [{ campaignId: '/campaign/remote', rewardName: 'Remote reward', updatedAt: '2026-10-18T13:00:00.000Z' }],
    });

    expect(merged.settings.showSubscriptions).toBe(true);
    expect(merged.favorites.map((favorite) => favorite.gameId)).toEqual(['/game/local', '/game/remote']);
    expect(merged.ignoredGames.map((game) => game.gameId)).toEqual(['/game/ignored-local', '/game/ignored-remote']);
    expect(merged.collectedRewards.map((reward) => reward.rewardName)).toEqual(['Local reward', 'Remote reward']);
    expect(merged).not.toHaveProperty('snapshots');
  });

  it('does not restore a record that has a newer remote deletion tombstone', () => {
    const merged = mergeTrackerSnapshots(local, {
      settings: null,
      favorites: [{ gameId: '/game/local', gameName: 'Local game', updatedAt: '2026-10-18T12:00:00.000Z', removedAt: '2026-10-18T14:00:00.000Z' }],
      ignoredGames: [],
      collectedRewards: [],
    });

    expect(merged.favorites).toEqual([]);
  });

  it('treats a tombstoned row as removed even when the database updated timestamp is later', () => {
    const merged = mergeTrackerSnapshots(local, {
      settings: null,
      favorites: [{ gameId: '/game/local', gameName: 'Local game', updatedAt: '2026-10-18T15:00:00.000Z', removedAt: '2026-10-18T14:00:00.000Z' }],
      ignoredGames: [],
      collectedRewards: [],
    });

    expect(merged.favorites).toEqual([]);
  });

  it('keeps the most recently changed preference and tombstones the conflicting older one', () => {
    const merged = mergeTrackerSnapshots({
      ...local,
      favorites: [{ gameId: '/game/airmech-strike', gameName: 'Airmech Strike', updatedAt: '2026-10-18T12:00:00.000Z' }],
      ignoredGames: [{ gameId: '/game/airmech-strike', gameName: 'Airmech Strike', updatedAt: '2026-10-18T13:00:00.000Z' }],
    }, { settings: null, favorites: [], ignoredGames: [], collectedRewards: [] });

    expect(merged.favorites).toEqual([{ gameId: '/game/airmech-strike', gameName: 'Airmech Strike', updatedAt: '2026-10-18T12:00:00.000Z', removedAt: expect.any(String) }]);
    expect(merged.ignoredGames).toEqual([{ gameId: '/game/airmech-strike', gameName: 'Airmech Strike', updatedAt: '2026-10-18T13:00:00.000Z' }]);
  });
});

describe('TrackerSyncService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps a theme selected while the initial account sync is in progress', async () => {
    localStorage.clear();
    let releaseReads!: () => void;
    const readsReady = new Promise<void>((resolve) => { releaseReads = resolve; });
    const rowsByTable: Record<string, readonly Record<string, unknown>[]> = {
      user_settings: [{ theme_color: 'twitch-purple', show_subscriptions: false, show_badges: false, updated_at: '2026-10-18T12:00:00.000Z' }],
      user_favorite_games: [],
      user_ignored_games: [],
      user_collected_rewards: [],
    };
    const client = {
      from: (table: string) => ({
        select: () => ({ eq: async () => { await readsReady; return { data: rowsByTable[table], error: null }; } }),
        upsert: async () => ({ error: null }),
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        TrackerSyncService,
        PreferencesService,
        CollectedRewardsService,
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'person@example.com' }) } },
        { provide: SUPABASE_AUTH_CLIENT, useValue: client },
      ],
    });
    const sync = TestBed.inject(TrackerSyncService);
    const preferences = TestBed.inject(PreferencesService);

    const syncing = sync.syncAfterAuthentication();
    preferences.setThemeColor('electric-blue');
    releaseReads();
    await syncing;

    expect(preferences.themeColor()).toBe('electric-blue');
  });

  it('keeps the device theme while adopting synced display settings', async () => {
    localStorage.clear();
    localStorage.setItem(THEME_COLOR_STORAGE_KEY, 'electric-blue');
    const rowsByTable: Record<string, readonly Record<string, unknown>[]> = {
      user_settings: [{ theme_color: 'emerald-glow', show_subscriptions: true, show_badges: false, updated_at: '2026-10-25T12:00:00.000Z' }],
      user_favorite_games: [],
      user_ignored_games: [],
      user_collected_rewards: [],
    };
    const client = {
      from: (table: string) => ({ select: () => ({ eq: async () => ({ data: rowsByTable[table], error: null }) }) }),
    };
    TestBed.configureTestingModule({
      providers: [
        TrackerSyncService,
        PreferencesService,
        CollectedRewardsService,
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'person@example.com' }) } },
        { provide: SUPABASE_AUTH_CLIENT, useValue: client },
      ],
    });
    const sync = TestBed.inject(TrackerSyncService);
    const preferences = TestBed.inject(PreferencesService);

    const result = await sync.syncAfterAuthentication();

    expect(result.status).toBe('synced');
    expect(preferences.themeColor()).toBe('electric-blue');
    expect(preferences.showSubscriptions()).toBe(true);
  });

  it('reads only synced display fields from account settings', async () => {
    localStorage.clear();
    const selectedColumns = new Map<string, string>();
    const client = {
      from: (table: string) => ({
        select: (columns: string) => {
          selectedColumns.set(table, columns);
          return { eq: async () => ({ data: [], error: null }) };
        },
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        TrackerSyncService,
        PreferencesService,
        CollectedRewardsService,
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'person@example.com' }) } },
        { provide: SUPABASE_AUTH_CLIENT, useValue: client },
      ],
    });

    await TestBed.inject(TrackerSyncService).syncAfterAuthentication();

    expect(selectedColumns.get('user_settings')).toBe('show_subscriptions,show_badges,updated_at');
  });

  it('requires an explicit source choice when an unlinked browser and account both have preferences', async () => {
    localStorage.clear();
    const rowsByTable: Record<string, readonly Record<string, unknown>[]> = {
      user_settings: [],
      user_favorite_games: [{ game_id: '/game/account', game_name: 'Account game', updated_at: '2026-10-18T12:00:00.000Z', removed_at: null }],
      user_ignored_games: [],
      user_collected_rewards: [],
    };
    const client = {
      from: (table: string) => ({ select: () => ({ eq: async () => ({ data: rowsByTable[table], error: null }) }) }),
    };
    TestBed.configureTestingModule({
      providers: [
        TrackerSyncService,
        PreferencesService,
        CollectedRewardsService,
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'person@example.com' }) } },
        { provide: SUPABASE_AUTH_CLIENT, useValue: client },
      ],
    });
    const sync = TestBed.inject(TrackerSyncService);
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/browser', 'Browser game');

    const result = await sync.syncAfterAuthentication();

    expect(result.status).toBe('skipped');
    expect(sync.status()).toBe('needs-reconciliation');
    expect(sync.reconciliation()).toMatchObject({ accountId: 'user-1', browserPreferenceCount: 1, accountPreferenceCount: 1 });
    expect(preferences.blacklistEntries().map((entry) => entry.id)).toEqual(['/game/browser']);
  });
});
