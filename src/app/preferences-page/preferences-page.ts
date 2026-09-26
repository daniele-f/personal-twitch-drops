import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DropsProvider } from '../drops/drops-provider';
import { PreferencesService } from '../preferences/preferences.service';
import { ImportExportService } from '../preferences/import-export.service';

@Component({ imports: [RouterLink], selector: 'app-preferences-page', templateUrl: './preferences-page.html', styleUrl: './preferences-page.scss' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  private readonly importExport = inject(ImportExportService);
  private readonly dropsProvider = inject(DropsProvider);
  protected readonly favoriteRows = computed(() => [...this.preferences.favoriteIds()].map((id) => ({ id, gameName: this.preferences.favoriteNames().get(id) ?? this.fallbackName(id) })));
  protected readonly favoritesExpanded = signal(false);
  protected readonly activeDropIds = signal<ReadonlySet<string> | null>(null);
  protected readonly dropStatusUnavailable = signal(false);
  protected readonly armedFavoriteId = signal<string | null>(null);
  protected readonly expanded = signal(false);
  protected readonly armedForId = signal<string | null>(null);
  protected readonly exportCode = signal('');
  protected readonly importCode = signal('');
  protected readonly importMessage = signal('');
  protected readonly copyMessage = signal('');
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
  protected removeFavorite(id: string): void { if (this.armedFavoriteId() === id) { this.preferences.removeFavorite(id); this.armedFavoriteId.set(null); } else this.armedFavoriteId.set(id); }
  protected cancelRemoveFavorite(id: string): void { if (this.armedFavoriteId() === id) this.armedFavoriteId.set(null); }
  private fallbackName(id: string): string { return (id.split('/').filter(Boolean).at(-1) || id).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
  protected remove(id: string): void { if (this.armedForId() === id) { this.preferences.removeBlacklist(id); this.armedForId.set(null); } else this.armedForId.set(id); }
  protected cancelRemove(id: string): void { if (this.armedForId() === id) this.armedForId.set(null); }
  protected generateShareCode(): void { this.exportCode.set(this.importExport.export()); }
  protected async copyShareCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.exportCode());
      this.copyMessage.set('Copied to clipboard.');
    } catch {
      this.copyMessage.set('Unable to copy automatically. Select and copy the code manually.');
    }
  }
  protected saveShareCode(): void {
    const url = URL.createObjectURL(new Blob([this.exportCode()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = this.shareCodeFileName();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  protected importLists(): void {
    if (this.importExport.import(this.importCode())) {
      this.importMessage.set('Lists replaced successfully.');
      this.importCode.set('');
    } else this.importMessage.set('That share code is not valid.');
  }
  private shareCodeFileName(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `personal-twitch-drops-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
  }
}
