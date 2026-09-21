import { Injectable, inject, signal } from '@angular/core';
import { BlacklistEntry } from './blacklist-entry';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences-storage';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  readonly favoriteIds = signal<ReadonlySet<string>>(this.readFavoriteIds());
  readonly blacklistEntries = signal<readonly BlacklistEntry[]>(this.readBlacklistEntries());

  addFavorite(id: string): void {
    if (!id || this.favoriteIds().has(id)) return;

    const next = new Set(this.favoriteIds());
    next.add(id);
    this.favoriteIds.set(next);
    this.persist(next);
  }

  removeFavorite(id: string): void {
    const next = new Set(this.favoriteIds());
    if (!next.delete(id)) return;

    this.favoriteIds.set(next);
    this.persist(next);
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

  private isBlacklistEntry(value: unknown): value is BlacklistEntry {
    if (!value || typeof value !== 'object') return false;
    const { id, gameName, blacklistedAt } = value as Record<string, unknown>;
    if (typeof id !== 'string' || !id || typeof gameName !== 'string' || !gameName || typeof blacklistedAt !== 'string') return false;

    const date = new Date(blacklistedAt);
    return !Number.isNaN(date.valueOf()) && date.toISOString() === blacklistedAt;
  }
}
