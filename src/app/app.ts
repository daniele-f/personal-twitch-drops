import { Component, computed, inject, isDevMode, signal } from '@angular/core';
import { ActiveDrop } from './drops/active-drop';
import { ChangesStateService } from './changes/changes-state.service';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ConflictResolutionComponent } from './conflict-resolution/conflict-resolution';
import { PreferencesService } from './preferences/preferences.service';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from './preferences/preferences-storage';
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
  protected readonly debugStorageInfo = signal<string | null>(null);
  protected readonly conflicts = computed(() => {
    const favorites = this.preferences.favoriteIds();
    return this.preferences.blacklistEntries().filter((entry) => favorites.has(entry.id));
  });
  constructor() {
    if (this.debugMenuEnabled) (window as Window & { twitchDropsDebug?: unknown }).twitchDropsDebug = { openMenu: () => this.debugMenuOpen.set(true), showAll: () => ['Available debug commands:', '- twitchDropsDebug.openMenu() — Open the debug menu.', '- twitchDropsDebug.changes.showAll() — List change scenarios.', '- twitchDropsDebug.storage.show() — Show saved favorites and ignored games.'].join('\n'), storage: { show: () => this.showStorage() }, changes: {
      showAll: () => ['Available change scenarios:', '- twitchDropsDebug.changes.newGame() — Show one new game.', '- twitchDropsDebug.changes.rewardSwap() — Show a same-count reward swap.', '- twitchDropsDebug.changes.endedGame() — Show an ended game.', '- twitchDropsDebug.changes.multipleGames() — Show three new games.', '- twitchDropsDebug.changes.newAndUpdated() — Show a new and an updated game.', '- twitchDropsDebug.changes.clear() — Reset the scenario.'].join('\n'),
      newGame: () => this.seed([], [this.drop('Arc Raiders', ['Raider pack'])]), rewardSwap: () => this.seed([this.drop("No Man's Sky", ['Atlas', 'Cosmic'])], [this.drop("No Man's Sky", ['Atlas', 'Nebula'])]), endedGame: () => this.seed([this.drop('Rust', ['Supply crate'])], []), multipleGames: () => this.seed([], [this.drop('Arc Raiders', ['Raider pack']), this.drop('Hades II', ['Moon dust']), this.drop('Pacific Drive', ['Garage decal'])]), newAndUpdated: () => this.seed([this.drop("No Man's Sky", ['Atlas', 'Cosmic'])], [this.drop("No Man's Sky", ['Atlas', 'Nebula']), this.drop('Arc Raiders', ['Raider pack'])]), clear: () => { const changes = this.changesState.clear(); this.changesOpen.set(false); return changes; },
    } };
  }
  protected keepFavorite(id: string): void { this.preferences.removeBlacklist(id); }
  protected hideGame(id: string): void { this.preferences.removeFavorite(id); }
  protected debugNewGame(): void { this.seed([], [this.drop('Arc Raiders', ['Raider pack'])]); }
  protected debugRewardSwap(): void { this.seed([this.drop("No Man's Sky", ['Atlas', 'Cosmic'])], [this.drop("No Man's Sky", ['Atlas', 'Nebula'])]); }
  protected debugEndedGame(): void { this.seed([this.drop('Rust', ['Supply crate'])], []); }
  protected debugMultipleGames(): void { this.seed([], [this.drop('Arc Raiders', ['Raider pack']), this.drop('Hades II', ['Moon dust']), this.drop('Pacific Drive', ['Garage decal'])]); }
  protected debugNewAndUpdated(): void { this.seed([this.drop("No Man's Sky", ['Atlas', 'Cosmic'])], [this.drop("No Man's Sky", ['Atlas', 'Nebula']), this.drop('Arc Raiders', ['Raider pack'])]); }
  protected debugClear(): void { this.changesState.clear(); this.changesOpen.set(false); }
  protected debugShowStorage(): void { this.debugStorageInfo.set(JSON.stringify(this.showStorage(), null, 2)); }
  private showStorage(): { available: boolean; favoriteIds: unknown; blacklistEntries: unknown } {
    if (!this.storage) return { available: false, favoriteIds: [], blacklistEntries: [] };
    try {
      return {
        available: true,
        favoriteIds: this.readStoredValue(FAVORITE_IDS_STORAGE_KEY),
        blacklistEntries: this.readStoredValue(BLACKLIST_ENTRIES_STORAGE_KEY),
      };
    } catch {
      return { available: false, favoriteIds: [], blacklistEntries: [] };
    }
  }
  private readStoredValue(key: string): unknown {
    const raw = this.storage?.getItem(key);
    if (raw === null || raw === undefined) return [];
    try { return JSON.parse(raw); } catch { return raw; }
  }
  private seed(previous: readonly ActiveDrop[], current: readonly ActiveDrop[]): readonly unknown[] { const changes = this.changesState.seed(previous, current); this.changesOpen.set(true); return changes; }
  private drop(gameName: string, rewards: readonly string[]): ActiveDrop { return { id: `/game/${gameName.toLowerCase().replaceAll(' ', '-')}`, gameName, rewardCount: rewards.length, rewards, endsAt: '2026-09-30T00:00:00.000Z' }; }
}
