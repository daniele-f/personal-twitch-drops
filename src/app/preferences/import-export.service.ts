import { Injectable, inject } from '@angular/core';
import { BlacklistEntry } from './blacklist-entry';
import { PreferencesService } from './preferences.service';

interface SharePayload {
  favorites: readonly { id: string; gameName?: string }[];
  blacklist: readonly BlacklistEntry[];
}

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly preferences = inject(PreferencesService);

  export(): string {
    const payload = [
      2,
      [...this.preferences.favoriteIds()].map((id) => [this.slugFor(id), ...(this.preferences.favoriteNames().get(id) ? [this.preferences.favoriteNames().get(id)!] : [])]),
      this.preferences.blacklistEntries().map((entry) => [this.slugFor(entry.id), entry.gameName]),
    ];
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
      if (!Array.isArray(parsed) || parsed.length !== 3) return null;
      const [version, favorites, blacklist] = parsed;
      if (version !== 2 || !Array.isArray(favorites) || !Array.isArray(blacklist)) return null;
      if (!favorites.every((favorite) => this.isCompactFavorite(favorite)) || !blacklist.every((entry) => this.isCompactBlacklistEntry(entry))) return null;
      const blacklistedAt = new Date().toISOString();
      return {
        favorites: favorites.map(([slug, gameName]) => ({ id: this.idFor(slug), ...(gameName ? { gameName } : {}) })),
        blacklist: blacklist.map(([slug, gameName]) => ({ id: this.idFor(slug), gameName, blacklistedAt })),
      };
    } catch {
      return null;
    }
  }

  private isCompactFavorite(value: unknown): value is [string, string?] {
    return Array.isArray(value) && (value.length === 1 || value.length === 2) && this.isSlug(value[0])
      && (value.length === 1 || (typeof value[1] === 'string' && !!value[1].trim()));
  }

  private isCompactBlacklistEntry(value: unknown): value is [string, string] {
    return Array.isArray(value) && value.length === 2 && this.isSlug(value[0]) && typeof value[1] === 'string' && !!value[1].trim();
  }

  private isSlug(value: unknown): value is string { return typeof value === 'string' && !!value && !value.includes('/'); }
  private slugFor(id: string): string { return id.startsWith('/game/') ? id.slice('/game/'.length) : id; }
  private idFor(slug: string): string { return `/game/${slug}`; }
}
