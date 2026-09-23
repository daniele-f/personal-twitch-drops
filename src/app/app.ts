import { Component, computed, inject, isDevMode, signal } from '@angular/core';
import { ActiveDrop } from './drops/active-drop';
import { ChangesStateService, DAILY_SNAPSHOTS_STORAGE_KEY } from './changes/changes-state.service';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ConflictResolutionComponent } from './conflict-resolution/conflict-resolution';
import { PreferencesService } from './preferences/preferences.service';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, FAVORITE_NAMES_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences/preferences-storage';
import { ButtonDirective } from './ui/button.directive';

@Component({
  imports: [ButtonDirective, ConflictResolutionComponent, RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly preferences = inject(PreferencesService);
  private readonly storage = inject(PREFERENCES_STORAGE);
  protected readonly changesState = inject(ChangesStateService);
  protected readonly changesOpen = signal(false);
  protected readonly debugMenuEnabled = isDevMode();
  protected readonly debugMenuOpen = signal(false);
  protected readonly debugFavoritesInfo = signal<string | null>(null);
  protected readonly debugIgnoredInfo = signal<string | null>(null);
  protected readonly debugPreviousDayInfo = signal<string | null>(null);
  protected readonly debugTodayInfo = signal<string | null>(null);
  protected readonly conflicts = computed(() => {
    const favorites = this.preferences.favoriteIds();
    return this.preferences.blacklistEntries().filter((entry) => favorites.has(entry.id));
  });
  constructor() {
    if (this.debugMenuEnabled) (window as Window & { twitchDropsDebug?: unknown }).twitchDropsDebug = { openMenu: () => this.debugMenuOpen.set(true), showAll: () => ['Available debug commands:', '- twitchDropsDebug.openMenu() — Open the debug menu.', '- twitchDropsDebug.changes.showAll() — List change scenarios.', '- twitchDropsDebug.storage.favorites() — Show saved favorites.', '- twitchDropsDebug.storage.ignored() — Show ignored games.', '- twitchDropsDebug.storage.previousDay() — Show the previous-day snapshot.', '- twitchDropsDebug.storage.today() — Show today\'s latest snapshot.'].join('\n'), storage: { favorites: () => this.showFavorites(), ignored: () => this.showIgnored(), previousDay: () => this.readSnapshots().baseline, today: () => this.readSnapshots().current }, changes: {
      showAll: () => ['Available change scenarios:', '- twitchDropsDebug.changes.newGame() — Show one new game.', '- twitchDropsDebug.changes.rewardSwap() — Show a same-count reward swap.', '- twitchDropsDebug.changes.endedGame() — Show an ended game.', '- twitchDropsDebug.changes.multipleGames() — Show three new games.', '- twitchDropsDebug.changes.newAndUpdated() — Show a new and an updated game.', '- twitchDropsDebug.changes.mockYesterday() — Compare live campaigns with a temporary mock of yesterday.', '- twitchDropsDebug.changes.clear() — Reset the scenario.'].join('\n'),
      newGame: () => this.seed([], [this.drop('Game 01', ['Raider pack'])]), rewardSwap: () => this.seed([this.drop('Game 01', ['Atlas', 'Cosmic'])], [this.drop('Game 01', ['Atlas', 'Nebula'])]), endedGame: () => this.seed([this.drop('Game 01', ['Supply crate'])], []), multipleGames: () => this.seed([], [this.drop('Game 01', ['Raider pack']), this.drop('Game 02', ['Moon dust']), this.drop('Game 03', ['Garage decal'])]), newAndUpdated: () => this.seed([this.drop('Game 01', ['Atlas', 'Cosmic'])], [this.drop('Game 01', ['Atlas', 'Nebula']), this.drop('Game 02', ['Raider pack'])]), mockYesterday: () => this.mockYesterday(), clear: () => { const changes = this.changesState.clear(); this.changesOpen.set(false); return changes; },
    } };
  }
  protected keepFavorite(id: string): void { this.preferences.removeBlacklist(id); }
  protected hideGame(id: string): void { this.preferences.removeFavorite(id); }
  protected debugNewGame(): void { this.seed([], [this.drop('Game 01', ['Raider pack'])]); }
  protected debugRewardSwap(): void { this.seed([this.drop('Game 01', ['Atlas', 'Cosmic'])], [this.drop('Game 01', ['Atlas', 'Nebula'])]); }
  protected debugEndedGame(): void { this.seed([this.drop('Game 01', ['Supply crate'])], []); }
  protected debugMultipleGames(): void { this.seed([], [this.drop('Game 01', ['Raider pack']), this.drop('Game 02', ['Moon dust']), this.drop('Game 03', ['Garage decal'])]); }
  protected debugNewAndUpdated(): void { this.seed([this.drop('Game 01', ['Atlas', 'Cosmic'])], [this.drop('Game 01', ['Atlas', 'Nebula']), this.drop('Game 02', ['Raider pack'])]); }
  protected debugMockYesterday(): void { this.mockYesterday(); }
  protected debugClear(): void { this.changesState.clear(); this.changesOpen.set(false); }
  protected debugShowFavorites(): void { this.debugFavoritesInfo.set(JSON.stringify(this.showFavorites(), null, 2)); }
  protected debugShowIgnored(): void { this.debugIgnoredInfo.set(JSON.stringify(this.showIgnored(), null, 2)); }
  protected debugShowPreviousDay(): void { this.debugPreviousDayInfo.set(JSON.stringify(this.readSnapshots().baseline, null, 2)); }
  protected debugShowToday(): void { this.debugTodayInfo.set(JSON.stringify(this.readSnapshots().current, null, 2)); }
  private showFavorites(): { available: boolean; favoriteIds: unknown; favoriteNames: unknown } {
    if (!this.storage) return { available: false, favoriteIds: [], favoriteNames: {} };
    try {
      return {
        available: true,
        favoriteIds: this.readStoredValue(FAVORITE_IDS_STORAGE_KEY),
        favoriteNames: this.readStoredValue(FAVORITE_NAMES_STORAGE_KEY, {}),
      };
    } catch {
      return { available: false, favoriteIds: [], favoriteNames: {} };
    }
  }
  private showIgnored(): { available: boolean; blacklistEntries: unknown } {
    if (!this.storage) return { available: false, blacklistEntries: [] };
    try { return { available: true, blacklistEntries: this.readStoredValue(BLACKLIST_ENTRIES_STORAGE_KEY) }; }
    catch { return { available: false, blacklistEntries: [] }; }
  }
  private readSnapshots(): { baseline: unknown; current: unknown } {
    if (!this.storage) return { baseline: null, current: null };
    try {
      const value = this.readStoredValue(DAILY_SNAPSHOTS_STORAGE_KEY, null);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { baseline: null, current: null };
      const snapshots = value as Record<string, unknown>;
      return { baseline: snapshots['baseline'] ?? null, current: snapshots['current'] ?? null };
    } catch {
      return { baseline: null, current: null };
    }
  }
  private mockYesterday(): readonly unknown[] {
    const current = this.changesState.drops();
    const previous = [...current.slice(1)];
    if (previous[0]) {
      const rewards = [...(previous[0].rewards ?? []), 'Debug yesterday-only reward'];
      previous[0] = { ...previous[0], rewardCount: rewards.length, rewards };
    }
    previous.push(this.drop('Yesterday Game', ['Expired reward']));
    return this.seed(previous, current);
  }
  private readStoredValue(key: string, emptyValue: unknown = []): unknown {
    const raw = this.storage?.getItem(key);
    if (raw === null || raw === undefined) return emptyValue;
    try { return JSON.parse(raw); } catch { return raw; }
  }
  private seed(previous: readonly ActiveDrop[], current: readonly ActiveDrop[]): readonly unknown[] { const changes = this.changesState.seed(previous, current); this.changesOpen.set(true); return changes; }
  private drop(gameName: string, rewards: readonly string[]): ActiveDrop { return { id: `/game/${gameName.toLowerCase().replaceAll(' ', '-')}`, gameName, rewardCount: rewards.length, rewards, endsAt: '2026-09-30T00:00:00.000Z' }; }
}
