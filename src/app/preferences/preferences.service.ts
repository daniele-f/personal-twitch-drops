import { Injectable, inject, signal } from '@angular/core';
import { FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences-storage';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  readonly favoriteIds = signal<ReadonlySet<string>>(this.readFavoriteIds());

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

  private persist(favoriteIds: ReadonlySet<string>): void {
    if (!this.storage) return;

    try {
      if (favoriteIds.size === 0) this.storage.removeItem(FAVORITE_IDS_STORAGE_KEY);
      else this.storage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify([...favoriteIds]));
    } catch {
      // Preferences remain available for this browser session.
    }
  }
}
