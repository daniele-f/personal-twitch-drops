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
      3,
      [...this.preferences.favoriteIds()].map((id) => this.slugFor(id)),
      this.preferences.blacklistEntries().map((entry) => this.slugFor(entry.id)),
    ];
    return `j${this.toUrlSafeBase64(new TextEncoder().encode(JSON.stringify(payload)))}`;
  }

  import(shareCode: string): boolean {
    const payload = this.decode(shareCode.trim());
    if (!payload) return false;

    this.preferences.replaceLists(payload.favorites, payload.blacklist);
    return true;
  }

  private decode(shareCode: string): SharePayload | null {
    try {
      if (!shareCode.startsWith('j')) return null;
      const parsed: unknown = JSON.parse(new TextDecoder().decode(this.fromUrlSafeBase64(shareCode.slice(1))));
      if (!Array.isArray(parsed) || parsed.length !== 3) return null;
      const [version, favorites, blacklist] = parsed;
      if (version !== 3 || !Array.isArray(favorites) || !Array.isArray(blacklist)) return null;
      if (!favorites.every((slug) => this.isSlug(slug)) || !blacklist.every((slug) => this.isSlug(slug))) return null;
      const blacklistedAt = new Date().toISOString();
      return {
        favorites: favorites.map((slug) => ({ id: this.idFor(slug), gameName: this.displayNameFor(slug) })),
        blacklist: blacklist.map((slug) => ({ id: this.idFor(slug), gameName: this.displayNameFor(slug), blacklistedAt })),
      };
    } catch {
      return null;
    }
  }

  private toUrlSafeBase64(bytes: Uint8Array): string { return btoa(String.fromCodePoint(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
  private fromUrlSafeBase64(value: string): Uint8Array {
    if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) throw new Error('Invalid URL-safe Base64.');
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    return Uint8Array.from(atob(base64), (character) => character.codePointAt(0)!);
  }
  private isSlug(value: unknown): value is string { return typeof value === 'string' && !!value && !value.includes('/'); }
  private slugFor(id: string): string { return id.startsWith('/game/') ? id.slice('/game/'.length) : id; }
  private idFor(slug: string): string { return `/game/${slug}`; }
  private displayNameFor(slug: string): string { return slug.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
}
