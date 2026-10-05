import { Injectable, computed, inject, signal } from '@angular/core';
import { BlacklistEntry } from './blacklist-entry';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, FAVORITE_NAMES_STORAGE_KEY, PREFERENCES_STORAGE, THEME_COLOR_STORAGE_KEY } from './preferences-storage';
import { PreferenceNotificationKind, PreferenceNotificationsService } from './preference-notifications.service';

export type ThemeColor = 'twitch-purple' | 'electric-blue' | 'neon-rose' | 'emerald-glow' | 'golden-amber';
export interface ThemeColorOption { readonly id: ThemeColor; readonly label: string; readonly accent: string; readonly hover: string; readonly soft: string; readonly indicator: string; }
const THEME_COLOR_OPTIONS: readonly ThemeColorOption[] = [
  { id: 'twitch-purple', label: 'Twitch Purple', accent: '#9147ff', hover: '#a970ff', soft: '#2d1b44', indicator: '#fff' },
  { id: 'electric-blue', label: 'Electric Blue', accent: '#3b82f6', hover: '#60a5fa', soft: '#172b4d', indicator: '#fff' },
  { id: 'neon-rose', label: 'Neon Rose', accent: '#ec4899', hover: '#f472b6', soft: '#4a1934', indicator: '#fff' },
  { id: 'emerald-glow', label: 'Emerald Glow', accent: '#22c55e', hover: '#4ade80', soft: '#143d27', indicator: '#18181b' },
  { id: 'golden-amber', label: 'Golden Amber', accent: '#f59e0b', hover: '#fbbf24', soft: '#4a3212', indicator: '#18181b' },
];

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly notifications = inject(PreferenceNotificationsService);
  readonly favoriteIds = signal<ReadonlySet<string>>(this.readFavoriteIds());
  readonly favoriteNames = signal<ReadonlyMap<string, string>>(this.readFavoriteNames());
  readonly blacklistEntries = signal<readonly BlacklistEntry[]>(this.readBlacklistEntries());
  readonly themeOptions = THEME_COLOR_OPTIONS;
  readonly themeColor = signal<ThemeColor>(this.readThemeColor());
  readonly selectedTheme = computed(() => this.themeOptions.find((theme) => theme.id === this.themeColor())!);

  setThemeColor(theme: ThemeColor): void {
    if (!this.themeOptions.some((option) => option.id === theme)) return;
    this.themeColor.set(theme);
    try { this.storage?.setItem(THEME_COLOR_STORAGE_KEY, theme); } catch { /* Theme remains available for this browser session. */ }
  }

  addFavorite(id: string, gameName?: string): void {
    if (!id) return;

    if (!this.favoriteIds().has(id)) {
      const next = new Set(this.favoriteIds());
      next.add(id);
      this.favoriteIds.set(next);
      this.persist(next);
      this.notify('favorite-added', gameName ?? this.nameFromId(id));
    }
    if (gameName) this.rememberFavoriteNames([{ id, gameName }]);
  }

  removeFavorite(id: string): void {
    const gameName = this.favoriteNames().get(id) ?? this.nameFromId(id);
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
    this.notify('favorite-removed', gameName);
  }

  clearFavorites(): void {
    if (!this.favoriteIds().size && !this.favoriteNames().size) return;

    const removed = [...this.favoriteIds()].map((id) => this.favoriteNames().get(id) ?? this.nameFromId(id));
    const favoriteIds = new Set<string>();
    const favoriteNames = new Map<string, string>();
    this.favoriteIds.set(favoriteIds);
    this.favoriteNames.set(favoriteNames);
    this.persist(favoriteIds);
    this.persistFavoriteNames(favoriteNames);
    for (const gameName of removed) this.notify('favorite-removed', gameName);
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
    this.notify('ignored-added', gameName);
  }

  removeBlacklist(id: string): void {
    const gameName = this.blacklistEntries().find((entry) => entry.id === id)?.gameName;
    const next = this.blacklistEntries().filter((entry) => entry.id !== id);
    if (next.length === this.blacklistEntries().length) return;

    this.blacklistEntries.set(next);
    this.persistBlacklist(next);
    if (gameName) this.notify('ignored-removed', gameName);
  }

  clearBlacklist(): void {
    if (!this.blacklistEntries().length) return;

    const removed = this.blacklistEntries().map((entry) => entry.gameName);
    const entries: readonly BlacklistEntry[] = [];
    this.blacklistEntries.set(entries);
    this.persistBlacklist(entries);
    for (const gameName of removed) this.notify('ignored-removed', gameName);
  }

  replaceLists(favorites: readonly { id: string; gameName?: string }[], blacklist: readonly BlacklistEntry[]): void {
    const previousFavoriteIds = this.favoriteIds();
    const previousFavoriteNames = this.favoriteNames();
    const previousBlacklist = this.blacklistEntries();
    const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
    const favoriteNames = new Map(favorites.flatMap((favorite) => favorite.gameName ? [[favorite.id, favorite.gameName.trim()] as const] : []));
    const blacklistEntries = [...blacklist].sort((left, right) => right.blacklistedAt.localeCompare(left.blacklistedAt));

    this.favoriteIds.set(favoriteIds);
    this.favoriteNames.set(favoriteNames);
    this.blacklistEntries.set(blacklistEntries);
    this.persist(favoriteIds);
    this.persistFavoriteNames(favoriteNames);
    this.persistBlacklist(blacklistEntries);
    this.notifyListReplacement(previousFavoriteIds, previousFavoriteNames, previousBlacklist, favoriteIds, favoriteNames, blacklistEntries);
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

  private readThemeColor(): ThemeColor {
    try {
      const stored = this.storage?.getItem(THEME_COLOR_STORAGE_KEY);
      return this.themeOptions.some((theme) => theme.id === stored) ? stored as ThemeColor : 'twitch-purple';
    } catch {
      return 'twitch-purple';
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

  private notifyListReplacement(previousFavoriteIds: ReadonlySet<string>, previousFavoriteNames: ReadonlyMap<string, string>, previousBlacklist: readonly BlacklistEntry[], favoriteIds: ReadonlySet<string>, favoriteNames: ReadonlyMap<string, string>, blacklistEntries: readonly BlacklistEntry[]): void {
    const previousBlacklistById = new Map(previousBlacklist.map((entry) => [entry.id, entry]));
    const blacklistById = new Map(blacklistEntries.map((entry) => [entry.id, entry]));
    for (const id of previousFavoriteIds) if (!favoriteIds.has(id)) this.notify('favorite-removed', previousFavoriteNames.get(id) ?? this.nameFromId(id));
    for (const id of favoriteIds) if (!previousFavoriteIds.has(id)) this.notify('favorite-added', favoriteNames.get(id) ?? this.nameFromId(id));
    for (const [id, entry] of previousBlacklistById) if (!blacklistById.has(id)) this.notify('ignored-removed', entry.gameName);
    for (const [id, entry] of blacklistById) if (!previousBlacklistById.has(id)) this.notify('ignored-added', entry.gameName);
  }

  private notify(kind: PreferenceNotificationKind, gameName: string): void { this.notifications.show(kind, gameName); }
  private nameFromId(id: string): string { return (id.split('/').filter(Boolean).at(-1) || id).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
}
