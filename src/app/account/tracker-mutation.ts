export type TrackerMutation =
  | { readonly type: 'settings'; readonly showSubscriptions: boolean; readonly showBadges: boolean; readonly showEmotes?: boolean }
  | { readonly type: 'favorite'; readonly gameId: string; readonly gameName: string }
  | { readonly type: 'ignore'; readonly gameId: string; readonly gameName: string }
  | { readonly type: 'unfavorite'; readonly gameId: string }
  | { readonly type: 'unignore'; readonly gameId: string }
  | { readonly type: 'game-name-history'; readonly list: 'favorite' | 'ignore'; readonly gameId: string; readonly gameName: string; readonly oldNames: readonly string[]; readonly observedAt?: string }
  | { readonly type: 'set-collected'; readonly campaignId: string; readonly rewardName: string; readonly collected: boolean };

export interface QueuedTrackerMutation { readonly accountId: string; readonly sequence: number; readonly mutation: TrackerMutation; }
