import { TestBed } from '@angular/core/testing';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences-storage';
import { PreferencesService } from './preferences.service';

function createStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initialValues));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('PreferencesService', () => {
  function configure(storage: Storage | null): PreferencesService {
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: storage }] });
    return TestBed.inject(PreferencesService);
  }

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('loads only unique non-empty favorite IDs from storage', () => {
    const service = configure(createStorage({ [FAVORITE_IDS_STORAGE_KEY]: '["/game/sea-of-thieves", "/game/sea-of-thieves", "/game/valorant"]' }));

    expect([...service.favoriteIds()]).toEqual(['/game/sea-of-thieves', '/game/valorant']);
  });

  it('starts empty for malformed stored favorites', () => {
    const service = configure(createStorage({ [FAVORITE_IDS_STORAGE_KEY]: '{"id":"/game/sea-of-thieves"}' }));

    expect([...service.favoriteIds()]).toEqual([]);
  });

  it('persists additions and removes the key after the final removal', () => {
    const storage = createStorage();
    const service = configure(storage);

    service.addFavorite('/game/sea-of-thieves');
    expect(storage.getItem(FAVORITE_IDS_STORAGE_KEY)).toBe('["/game/sea-of-thieves"]');

    service.removeFavorite('/game/sea-of-thieves');
    expect(storage.getItem(FAVORITE_IDS_STORAGE_KEY)).toBeNull();
  });

  it('persists a dated blacklist entry and preserves its original timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T10:00:00.000Z'));
    const storage = createStorage();
    const service = configure(storage);

    service.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
    vi.setSystemTime(new Date('2026-09-22T10:00:00.000Z'));
    service.addBlacklist('/game/sea-of-thieves', 'Different name');

    expect(service.blacklistEntries()).toEqual([
      { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-21T10:00:00.000Z' },
    ]);
    expect(storage.getItem(BLACKLIST_ENTRIES_STORAGE_KEY)).toBe('[{"id":"/game/sea-of-thieves","gameName":"Sea of Thieves","blacklistedAt":"2026-09-21T10:00:00.000Z"}]');
  });

  it('uses the newest valid entry for duplicate blacklist IDs', () => {
    const service = configure(createStorage({
      [BLACKLIST_ENTRIES_STORAGE_KEY]: JSON.stringify([
        { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-21T10:00:00.000Z' },
        { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-22T10:00:00.000Z' },
        { id: '/game/bad', gameName: '', blacklistedAt: 'not-a-date' },
      ]),
    }));

    expect(service.blacklistEntries()).toEqual([
      { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-22T10:00:00.000Z' },
    ]);
  });

  it('removes the blacklist storage key after the final entry is removed', () => {
    const storage = createStorage();
    const service = configure(storage);

    service.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
    service.removeBlacklist('/game/sea-of-thieves');

    expect(storage.getItem(BLACKLIST_ENTRIES_STORAGE_KEY)).toBeNull();
  });

  it('keeps favorites in memory when storage is unavailable', () => {
    const service = configure(null);

    service.addFavorite('/game/sea-of-thieves');

    expect(service.favoriteIds().has('/game/sea-of-thieves')).toBe(true);
  });
});
