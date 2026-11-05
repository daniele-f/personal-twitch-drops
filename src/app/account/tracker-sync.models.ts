export interface TrackerSettings {
  showSubscriptions: boolean;
  showBadges: boolean;
  updatedAt: string;
}

export interface TrackerFavorite {
  gameId: string;
  gameName: string | null;
  updatedAt: string;
  removedAt?: string | null;
}

export interface TrackerIgnoredGame {
  gameId: string;
  gameName: string | null;
  updatedAt: string;
  removedAt?: string | null;
}

export interface TrackerCollectedReward {
  campaignId: string;
  rewardName: string;
  updatedAt: string;
  clearedAt?: string | null;
}

export interface LocalTrackerSnapshot {
  settings: TrackerSettings;
  favorites: readonly TrackerFavorite[];
  ignoredGames: readonly TrackerIgnoredGame[];
  collectedRewards: readonly TrackerCollectedReward[];
}

export interface RemoteTrackerSnapshot {
  settings: TrackerSettings | null;
  favorites: readonly TrackerFavorite[];
  ignoredGames: readonly TrackerIgnoredGame[];
  collectedRewards: readonly TrackerCollectedReward[];
}

export interface SyncResult {
  status: 'synced' | 'skipped' | 'error';
  message?: string;
}

export type TrackerSyncStatus = 'idle' | 'syncing' | 'needs-reconciliation' | 'pending-retry' | 'error';

export interface TrackerDifferenceGroup {
  category: 'favorites' | 'ignored' | 'rewards' | 'settings';
  label: string;
  items: readonly string[];
}

export interface TrackerDifferenceSide {
  groups: readonly TrackerDifferenceGroup[];
}

export interface TrackerReconciliation {
  accountId: string;
  browserPreferenceCount: number;
  accountPreferenceCount: number;
  differences: { account: TrackerDifferenceSide; local: TrackerDifferenceSide };
}
