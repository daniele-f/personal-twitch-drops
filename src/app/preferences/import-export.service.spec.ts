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

  it('exports a slug-only URL-safe code that restores slug-derived display names', async () => {
    const sourceStorage = createStorage();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: sourceStorage }] });
    const sourcePreferences = TestBed.inject(PreferencesService);
    const source = TestBed.inject(ImportExportService);
    sourcePreferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    sourcePreferences.addBlacklist('/game/valorant', 'VALORANT');
    const shareCode = await source.export();

    expect(shareCode).not.toContain('Sea of Thieves');
    expect(shareCode).not.toContain('VALORANT');
    expect(shareCode).toMatch(/^[A-Za-z0-9_-]+$/);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
    const targetPreferences = TestBed.inject(PreferencesService);
    const target = TestBed.inject(ImportExportService);
    targetPreferences.addFavorite('/game/old-game', 'Old Game');
    targetPreferences.addBlacklist('/game/old-ignored', 'Old Ignored');

    expect(await target.import(shareCode)).toBe(true);
    expect([...targetPreferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(targetPreferences.favoriteNames().get('/game/sea-of-thieves')).toBe('Sea Of Thieves');
    expect(targetPreferences.blacklistEntries()).toEqual([
      { id: '/game/valorant', gameName: 'Valorant', blacklistedAt: expect.any(String) },
    ]);
  });

  it('falls back to an uncompressed slug-only code when native streams are unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    vi.stubGlobal('DecompressionStream', undefined);
    try {
      TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
      const sourcePreferences = TestBed.inject(PreferencesService);
      const source = TestBed.inject(ImportExportService);
      sourcePreferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
      sourcePreferences.addBlacklist('/game/valorant', 'VALORANT');

      const shareCode = await source.export();
      expect(shareCode).toMatch(/^j[A-Za-z0-9_-]+$/);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
      const targetPreferences = TestBed.inject(PreferencesService);
      const target = TestBed.inject(ImportExportService);

      expect(await target.import(shareCode)).toBe(true);
      expect([...targetPreferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
      expect(targetPreferences.blacklistEntries().map((entry) => entry.id)).toEqual(['/game/valorant']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('leaves both lists untouched when the share code is invalid', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
    const preferences = TestBed.inject(PreferencesService);
    const importExport = TestBed.inject(ImportExportService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');

    expect(await importExport.import('not-a-share-code')).toBe(false);
    expect([...preferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(preferences.blacklistEntries().map((entry) => entry.id)).toEqual(['/game/valorant']);
  });

  it('rejects v2 share codes', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: createStorage() }] });
    const importExport = TestBed.inject(ImportExportService);
    const v2ShareCode = btoa(JSON.stringify([2, [], []]));

    expect(await importExport.import(v2ShareCode)).toBe(false);
  });
});
