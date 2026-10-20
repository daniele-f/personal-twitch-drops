import type { ThemeColor } from '../preferences/preferences.service';

export type TrackerMutation =
  | { readonly type: 'settings'; readonly themeColor: ThemeColor; readonly showSubscriptions: boolean; readonly showBadges: boolean }
  | { readonly type: 'favorite' | 'ignore'; readonly gameId: string; readonly gameName: string }
  | { readonly type: 'unfavorite' | 'unignore'; readonly gameId: string }
  | { readonly type: 'set-collected'; readonly campaignId: string; readonly rewardName: string; readonly collected: boolean }
  | { readonly type: 'restore-all-ignored' };

export interface QueuedTrackerMutation { readonly accountId: string; readonly sequence: number; readonly mutation: TrackerMutation; }
