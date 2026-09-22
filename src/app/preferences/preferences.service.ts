import { Injectable, inject, signal } from '@angular/core';
import { BlacklistEntry } from './blacklist-entry';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, FAVORITE_NAMES_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences-storage';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  readonly favoriteIds = signal<ReadonlySet<string>>(this.readFavoriteIds());
  readonly favoriteNames = signal<ReadonlyMap<string, string>>(this.readFavoriteNames());
  readonly blacklistEntries = signal<readonly BlacklistEntry[]>(this.readBlacklistEntries());

  addFavorite(id: string, gameName?: string): void {
    if (!id) return;

    if (!this.favoriteIds().has(id)) {
      const next = new Set(this.favoriteIds());
      next.add(id);
      this.favoriteIds.set(next);
      this.persist(next);
    }
    if (gameName) this.rememberFavoriteNames([{ id, gameName }]);
  }

  removeFavorite(id: string): void {
    const next = new Set(this.favoriteIds());
    if (!next.delete(id)) return;

    this.favoriteIds.set(next);
    this.persist(next);
    if (this.favoriteNames().has(id)) {
      const names = new Map(this.favoriteNames());
      names.delete(id);
      this.favoriteNames.set(names);
      this.persistFavoriteNames(names);
    }
  }

  rememberFavoriteNames(games: readonly { id: string; gameName: string }[]): void {
    const names = new Map(this.favoriteNames());
    let changed = false;
    for (const game of games) {
      const name = game.gameName.trim();
      if (!this.favoriteIds().has(game.id) || !name || names.get(game.id) === name) continue;
      names.set(game.id, name);
      changed = true;
    }
    if (!changed) return;
    this.favoriteNames.set(names);
    this.persistFavoriteNames(names);
  }

  addBlacklist(id: string, gameName: string): void {
    if (!id || !gameName || this.blacklistEntries().some((entry) => entry.id === id)) return;

    const next = [{ id, gameName, blacklistedAt: new Date().toISOString() }, ...this.blacklistEntries()];
    this.blacklistEntries.set(next);
    this.persistBlacklist(next);
  }

  removeBlacklist(id: string): void {
    const next = this.blacklistEntries().filter((entry) => entry.id !== id);
    if (next.length === this.blacklistEntries().length) return;

    this.blacklistEntries.set(next);
    this.persistBlacklist(next);
  }

  private readFavoriteIds(): ReadonlySet<string> {
    if (!this.storage) return new Set();

    try {
      const value = this.storage.getItem(FAVORITE_IDS_STORAGE_KEY);
      const parsed: unknown = value === null ? [] : JSON.parse(value);
      if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string' || !id)) return new Set();
      return new Set(parsed);
    } catch {
      return new Set();
    }
  }

  private readBlacklistEntries(): readonly BlacklistEntry[] {
    if (!this.storage) return [];

    try {
      const value = this.storage.getItem(BLACKLIST_ENTRIES_STORAGE_KEY);
      const parsed: unknown = value === null ? [] : JSON.parse(value);
      if (!Array.isArray(parsed)) return [];

      const byId = new Map<string, BlacklistEntry>();
      for (const entry of parsed) {
        if (!this.isBlacklistEntry(entry)) continue;
        const current = byId.get(entry.id);
        if (!current || entry.blacklistedAt > current.blacklistedAt) byId.set(entry.id, entry);
      }

      return [...byId.values()].sort((left, right) => right.blacklistedAt.localeCompare(left.blacklistedAt));
    } catch {
      return [];
    }
  }

  private readFavoriteNames(): ReadonlyMap<string, string> {
    if (!this.storage) return new Map();
    try {
      const value = this.storage.getItem(FAVORITE_NAMES_STORAGE_KEY);
      const parsed: unknown = value === null ? {} : JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
      return new Map(Object.entries(parsed).filter(([id, name]) => this.favoriteIds().has(id) && typeof name === 'string' && name.trim()).map(([id, name]) => [id, name as string]));
    } catch {
      return new Map();
    }
  }

  private persist(favoriteIds: ReadonlySet<string>): void {
    if (!this.storage) return;

    try {
      if (favoriteIds.size === 0) this.storage.removeItem(FAVORITE_IDS_STORAGE_KEY);
      else this.storage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify([...favoriteIds]));
    } catch {
      // Preferences remain available for this browser session.
    }
  }

  private persistBlacklist(entries: readonly BlacklistEntry[]): void {
    if (!this.storage) return;

    try {
      if (entries.length === 0) this.storage.removeItem(BLACKLIST_ENTRIES_STORAGE_KEY);
      else this.storage.setItem(BLACKLIST_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Preferences remain available for this browser session.
    }
  }

  private persistFavoriteNames(names: ReadonlyMap<string, string>): void {
    if (!this.storage) return;
    try {
      if (names.size === 0) this.storage.removeItem(FAVORITE_NAMES_STORAGE_KEY);
      else this.storage.setItem(FAVORITE_NAMES_STORAGE_KEY, JSON.stringify(Object.fromEntries(names)));
    } catch {
      // Preferences remain available for this browser session.
    }
  }

  private isBlacklistEntry(value: unknown): value is BlacklistEntry {
    if (!value || typeof value !== 'object') return false;
    const { id, gameName, blacklistedAt } = value as Record<string, unknown>;
    if (typeof id !== 'string' || !id || typeof gameName !== 'string' || !gameName || typeof blacklistedAt !== 'string') return false;

    const date = new Date(blacklistedAt);
    return !Number.isNaN(date.valueOf()) && date.toISOString() === blacklistedAt;
  }
}
