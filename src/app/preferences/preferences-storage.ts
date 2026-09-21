import { InjectionToken } from '@angular/core';

export const FAVORITE_IDS_STORAGE_KEY = 'personal-twitch-drops.favorite-ids.v1';
export const BLACKLIST_ENTRIES_STORAGE_KEY = 'personal-twitch-drops.blacklist-entries.v1';

export const PREFERENCES_STORAGE = new InjectionToken<Storage | null>('preferences storage', {
  factory: (): Storage | null => {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  },
});
