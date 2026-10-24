import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DropsProvider } from '../drops/drops-provider';
import { PreferencesService, ThemeColor } from '../preferences/preferences.service';
import { DisclosureComponent } from '../ui/disclosure';
import { StatusBadgeComponent } from '../ui/status-badge';

@Component({ imports: [RouterLink, DisclosureComponent, StatusBadgeComponent], selector: 'app-preferences-page', templateUrl: './preferences-page.html' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  private readonly dropsProvider = inject(DropsProvider);
  protected readonly favoriteRows = computed(() => [...this.preferences.favoriteIds()]
    .map((id) => ({ id, gameName: this.preferences.favoriteNames().get(id) ?? this.fallbackName(id) }))
    .sort((left, right) => left.gameName.localeCompare(right.gameName, undefined, { sensitivity: 'base' })));
  protected readonly ignoredRows = computed(() => [...this.preferences.blacklistEntries()]
    .sort((left, right) => left.gameName.localeCompare(right.gameName, undefined, { sensitivity: 'base' })));
  protected readonly favoritesExpanded = signal(false);
  protected readonly activeDropIds = signal<ReadonlySet<string> | null>(null);
  protected readonly dropStatusUnavailable = signal(false);
  protected readonly armedFavoriteId = signal<string | null>(null);
  protected readonly expanded = signal(false);
  protected readonly armedForId = signal<string | null>(null);
  protected readonly fileDragActive = signal(false);
  constructor() {
    if (this.preferences.favoriteIds().size || this.preferences.blacklistEntries().length) {
      this.dropsProvider.loadActiveDrops().subscribe({
        next: (drops) => {
          this.activeDropIds.set(new Set(drops.map((drop) => drop.id)));
          this.preferences.rememberFavoriteNames(drops);
        },
        error: () => this.dropStatusUnavailable.set(true),
      });
    }
  }
  protected selectThemeColor(theme: ThemeColor): void { this.preferences.setThemeColor(theme); }
  protected removeFavorite(id: string): void { if (this.armedFavoriteId() === id) { this.preferences.removeFavorite(id); this.armedFavoriteId.set(null); } else this.armedFavoriteId.set(id); }
  protected cancelRemoveFavorite(id: string): void { if (this.armedFavoriteId() === id) this.armedFavoriteId.set(null); }
  private fallbackName(id: string): string { return (id.split('/').filter(Boolean).at(-1) || id).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
  protected remove(id: string): void { if (this.armedForId() === id) { this.preferences.removeBlacklist(id); this.armedForId.set(null); } else this.armedForId.set(id); }
  protected cancelRemove(id: string): void { if (this.armedForId() === id) this.armedForId.set(null); }
}
