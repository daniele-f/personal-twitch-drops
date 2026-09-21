import { TestBed } from '@angular/core/testing';
import { FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences-storage';
import { PreferencesService } from './preferences.service';

function createStorage(initialValue: string | null = null): Storage {
  let value = initialValue;
  return {
    get length() { return value === null ? 0 : 1; },
    clear: () => { value = null; },
    getItem: (key) => key === FAVORITE_IDS_STORAGE_KEY ? value : null,
    key: () => value === null ? null : FAVORITE_IDS_STORAGE_KEY,
    removeItem: (key) => { if (key === FAVORITE_IDS_STORAGE_KEY) value = null; },
    setItem: (key, nextValue) => { if (key === FAVORITE_IDS_STORAGE_KEY) value = nextValue; },
  };
}

describe('PreferencesService', () => {
  function configure(storage: Storage | null): PreferencesService {
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: storage }] });
    return TestBed.inject(PreferencesService);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('loads only unique non-empty favorite IDs from storage', () => {
    const service = configure(createStorage('["/game/sea-of-thieves", "/game/sea-of-thieves", "/game/valorant"]'));

    expect([...service.favoriteIds()]).toEqual(['/game/sea-of-thieves', '/game/valorant']);
  });

  it('starts empty for malformed stored favorites', () => {
    const service = configure(createStorage('{"id":"/game/sea-of-thieves"}'));

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

  it('keeps favorites in memory when storage is unavailable', () => {
    const service = configure(null);

    service.addFavorite('/game/sea-of-thieves');

    expect(service.favoriteIds().has('/game/sea-of-thieves')).toBe(true);
  });
});
