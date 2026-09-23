import { Injectable, inject } from '@angular/core';
import { BlacklistEntry } from './blacklist-entry';
import { PreferencesService } from './preferences.service';

interface SharePayload {
  version: 1;
  favorites: readonly { id: string; gameName?: string }[];
  blacklist: readonly BlacklistEntry[];
}

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly preferences = inject(PreferencesService);

  export(): string {
    const payload: SharePayload = {
      version: 1,
      favorites: [...this.preferences.favoriteIds()].map((id) => ({ id, ...(this.preferences.favoriteNames().get(id) ? { gameName: this.preferences.favoriteNames().get(id) } : {}) })),
      blacklist: this.preferences.blacklistEntries(),
    };
    return btoa(String.fromCodePoint(...new TextEncoder().encode(JSON.stringify(payload))));
  }

  import(shareCode: string): boolean {
    const payload = this.decode(shareCode.trim());
    if (!payload) return false;

    this.preferences.replaceLists(payload.favorites, payload.blacklist);
    return true;
  }

  private decode(shareCode: string): SharePayload | null {
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(shareCode), (character) => character.codePointAt(0)!)));
      if (!parsed || typeof parsed !== 'object') return null;
      const { version, favorites, blacklist } = parsed as Record<string, unknown>;
      if (version !== 1 || !Array.isArray(favorites) || !Array.isArray(blacklist)) return null;
      if (!favorites.every((favorite) => this.isFavorite(favorite)) || !blacklist.every((entry) => this.isBlacklistEntry(entry))) return null;
      return { version, favorites, blacklist };
    } catch {
      return null;
    }
  }

  private isFavorite(value: unknown): value is { id: string; gameName?: string } {
    if (!value || typeof value !== 'object') return false;
    const { id, gameName } = value as Record<string, unknown>;
    return typeof id === 'string' && !!id && (gameName === undefined || (typeof gameName === 'string' && !!gameName.trim()));
  }

  private isBlacklistEntry(value: unknown): value is BlacklistEntry {
    if (!value || typeof value !== 'object') return false;
    const { id, gameName, blacklistedAt } = value as Record<string, unknown>;
    if (typeof id !== 'string' || !id || typeof gameName !== 'string' || !gameName || typeof blacklistedAt !== 'string') return false;
    const date = new Date(blacklistedAt);
    return !Number.isNaN(date.valueOf()) && date.toISOString() === blacklistedAt;
  }
}
