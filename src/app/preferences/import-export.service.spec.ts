import { TestBed } from '@angular/core/testing';
import { PREFERENCES_STORAGE } from './preferences-storage';
import { ImportExportService } from './import-export.service';
import { PreferencesService } from './preferences.service';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('ImportExportService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exports an opaque share code that replaces both lists when imported', () => {
    const sourceStorage = createStorage();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: sourceStorage }] });
    const sourcePreferences = TestBed.inject(PreferencesService);
    const source = TestBed.inject(ImportExportService);
    sourcePreferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    sourcePreferences.addBlacklist('/game/valorant', 'VALORANT');
    const shareCode = source.export();

    expect(shareCode).not.toContain('Sea of Thieves');
    expect(shareCode).not.toContain('VALORANT');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
    const targetPreferences = TestBed.inject(PreferencesService);
    const target = TestBed.inject(ImportExportService);
    targetPreferences.addFavorite('/game/old-game', 'Old Game');
    targetPreferences.addBlacklist('/game/old-ignored', 'Old Ignored');

    expect(target.import(shareCode)).toBe(true);
    expect([...targetPreferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(targetPreferences.favoriteNames().get('/game/sea-of-thieves')).toBe('Sea of Thieves');
    expect(targetPreferences.blacklistEntries()).toEqual([
      { id: '/game/valorant', gameName: 'VALORANT', blacklistedAt: expect.any(String) },
    ]);
  });

  it('leaves both lists untouched when the share code is invalid', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
    const preferences = TestBed.inject(PreferencesService);
    const importExport = TestBed.inject(ImportExportService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');

    expect(importExport.import('not-a-share-code')).toBe(false);
    expect([...preferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(preferences.blacklistEntries().map((entry) => entry.id)).toEqual(['/game/valorant']);
  });
});
