import { Component, computed, inject, signal } from '@angular/core';
import { DropsProvider } from '../drops/drops-provider';
import { DropListComponent } from '../drop-list/drop-list';
import { PreferencesService } from '../preferences/preferences.service';
import { ChangesStateService } from '../changes/changes-state.service';
import { ActiveDrop } from '../drops/active-drop';

@Component({ imports: [DropListComponent], selector: 'app-drops-page', templateUrl: './drops-page.html', styleUrl: './drops-page.scss' })
export class DropsPageComponent {
  private readonly dropsProvider = inject(DropsProvider);
  private readonly changesState = inject(ChangesStateService);
  protected readonly preferences = inject(PreferencesService);
  protected readonly drops = this.changesState.drops;
  protected readonly searchTerm = signal('');
  protected readonly searchActive = computed(() => this.searchTerm().trim().length > 0);
  protected readonly loading = signal(true);
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly blacklistedIds = computed(() => new Set(this.preferences.blacklistEntries().map((entry) => entry.id)));
  protected readonly favoriteDrops = computed(() => {
    const favorites = this.preferences.favoriteIds(); const blacklisted = this.blacklistedIds();
    return this.drops().filter((drop) => favorites.has(drop.id) && (this.searchActive() || !blacklisted.has(drop.id)));
  });
  protected readonly activeDrops = computed(() => {
    const favorites = this.preferences.favoriteIds(); const blacklisted = this.blacklistedIds();
    return this.drops().filter((drop) => !favorites.has(drop.id) && (this.searchActive() || !blacklisted.has(drop.id)));
  });
  protected readonly filteredFavoriteDrops = computed(() => this.filterBySearchTerm(this.favoriteDrops()));
  protected readonly filteredActiveDrops = computed(() => this.filterBySearchTerm(this.activeDrops()));
  protected readonly newDropIds = computed(() => new Set(this.changesState.changes().filter((change) => change.type === 'new').map((change) => change.drop.id)));
  protected readonly updatedDropIds = computed(() => new Set(this.changesState.changes().filter((change) => change.type === 'updated').map((change) => change.drop.id)));
  private requestVersion = 0;
  constructor() { this.loadDrops(); }
  protected loadDrops(): void { const requestVersion = ++this.requestVersion; this.loading.set(true); this.loadFailed.set(false); this.dropsProvider.loadActiveDrops().subscribe({ next: (drops) => { if (requestVersion !== this.requestVersion) return; this.changesState.updateDrops(drops); this.updatedAt.set(new Date()); this.loading.set(false); }, error: () => { if (requestVersion !== this.requestVersion) return; this.loadFailed.set(true); this.loading.set(false); } }); }
  protected updatedLabel(): string { const updatedAt = this.updatedAt(); const count = this.drops().length; return updatedAt ? `✓ Loaded ${count} active Drop${count === 1 ? '' : 's'} at ${new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(updatedAt)}` : 'Loading active Drops'; }
  private filterBySearchTerm(drops: readonly ActiveDrop[]): readonly ActiveDrop[] {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase();
    return searchTerm ? drops.filter((drop) => drop.gameName.toLocaleLowerCase().includes(searchTerm)) : drops;
  }
}
