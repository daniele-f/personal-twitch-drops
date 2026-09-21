import { Component, computed, inject } from '@angular/core';
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
  protected readonly conflicts = computed(() => {
    const favorites = this.preferences.favoriteIds();
    return this.preferences.blacklistEntries().filter((entry) => favorites.has(entry.id));
  });
  protected keepFavorite(id: string): void { this.preferences.removeBlacklist(id); }
  protected hideGame(id: string): void { this.preferences.removeFavorite(id); }
}
