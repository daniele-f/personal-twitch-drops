import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DropsProvider } from '../drops/drops-provider';
import { PreferencesService } from '../preferences/preferences.service';

@Component({ imports: [RouterLink], selector: 'app-preferences-page', templateUrl: './preferences-page.html', styleUrl: './preferences-page.scss' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  private readonly dropsProvider = inject(DropsProvider);
  protected readonly favoriteRows = computed(() => [...this.preferences.favoriteIds()].map((id) => ({ id, gameName: this.preferences.favoriteNames().get(id) ?? this.fallbackName(id) })));
  protected readonly favoritesExpanded = signal(false);
  protected readonly activeFavoriteIds = signal<ReadonlySet<string> | null>(null);
  protected readonly favoriteStatusUnavailable = signal(false);
  protected readonly armedFavoriteId = signal<string | null>(null);
  protected readonly expanded = signal(false);
  protected readonly armedForId = signal<string | null>(null);
  constructor() {
    if (this.preferences.favoriteIds().size) {
      this.dropsProvider.loadActiveDrops().subscribe({
        next: (drops) => {
          this.activeFavoriteIds.set(new Set(drops.map((drop) => drop.id)));
          this.preferences.rememberFavoriteNames(drops);
        },
        error: () => this.favoriteStatusUnavailable.set(true),
      });
    }
  }
  protected removeFavorite(id: string): void { if (this.armedFavoriteId() === id) { this.preferences.removeFavorite(id); this.armedFavoriteId.set(null); } else this.armedFavoriteId.set(id); }
  protected cancelRemoveFavorite(id: string): void { if (this.armedFavoriteId() === id) this.armedFavoriteId.set(null); }
  private fallbackName(id: string): string { return (id.split('/').filter(Boolean).at(-1) || id).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
  protected remove(id: string): void { if (this.armedForId() === id) { this.preferences.removeBlacklist(id); this.armedForId.set(null); } else this.armedForId.set(id); }
  protected cancelRemove(id: string): void { if (this.armedForId() === id) this.armedForId.set(null); }
}
