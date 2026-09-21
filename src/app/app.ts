import { Component, computed, inject, isDevMode, signal } from '@angular/core';
import { ActiveDrop } from './drops/active-drop';
import { ChangesStateService } from './changes/changes-state.service';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ConflictResolutionComponent } from './conflict-resolution/conflict-resolution';
import { PreferencesService } from './preferences/preferences.service';
import { ButtonDirective } from './ui/button.directive';

@Component({
  imports: [ButtonDirective, ConflictResolutionComponent, RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly preferences = inject(PreferencesService);
  protected readonly changesState = inject(ChangesStateService);
  protected readonly changesOpen = signal(false);
  protected readonly conflicts = computed(() => {
    const favorites = this.preferences.favoriteIds();
    return this.preferences.blacklistEntries().filter((entry) => favorites.has(entry.id));
  });
  constructor() {
    if (isDevMode()) (window as Window & { twitchDropsDebug?: unknown }).twitchDropsDebug = {
      newGame: () => this.seed([], [this.drop('Arc Raiders', ['Raider pack'])]),
      rewardSwap: () => this.seed([this.drop("No Man's Sky", ['Atlas', 'Cosmic'])], [this.drop("No Man's Sky", ['Atlas', 'Nebula'])]),
      endedGame: () => this.seed([this.drop('Rust', ['Supply crate'])], []),
      clear: () => this.changesState.clear(),
    };
  }
  protected keepFavorite(id: string): void { this.preferences.removeBlacklist(id); }
  protected hideGame(id: string): void { this.preferences.removeFavorite(id); }
  private seed(previous: readonly ActiveDrop[], current: readonly ActiveDrop[]): void { this.changesState.seed(previous, current); this.changesOpen.set(true); }
  private drop(gameName: string, rewards: readonly string[]): ActiveDrop { return { id: `/game/${gameName.toLowerCase().replaceAll(' ', '-')}`, gameName, rewardCount: rewards.length, rewards, endsAt: '2026-09-30T00:00:00.000Z' }; }
}
