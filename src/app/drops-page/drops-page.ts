import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DropsProvider } from '../drops/drops-provider';
import { DropListComponent } from '../drop-list/drop-list';
import { PreferencesService } from '../preferences/preferences.service';
import { ChangesStateService } from '../changes/changes-state.service';
import { ActiveDrop } from '../drops/active-drop';
import { CampaignCelebrationsService } from '../drops/campaign-celebrations.service';
import { RefreshLoaderComponent } from '../ui/refresh-loader';
import { ButtonDirective } from '../ui/button.directive';

const DROPS_CACHE_KEY = 'personal-twitch-drops.active-drops.v1';
const DROPS_CACHE_MAX_AGE_MS = 5 * 60_000;

interface CachedDrops {
  readonly drops: readonly ActiveDrop[];
  readonly updatedAt: number;
}

@Component({ imports: [ButtonDirective, DropListComponent, RefreshLoaderComponent], selector: 'app-drops-page', templateUrl: './drops-page.html' })
export class DropsPageComponent {
  private readonly dropsProvider = inject(DropsProvider);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changesState = inject(ChangesStateService);
  private readonly celebrations = inject(CampaignCelebrationsService);
  protected readonly preferences = inject(PreferencesService);
  protected readonly drops = this.changesState.drops;
  protected readonly searchTerm = signal('');
  protected readonly searchActive = computed(() => this.searchTerm().trim().length > 0);
  protected readonly loading = signal(true);
  protected readonly initialLoading = computed(() => this.loading() && !this.drops().length);
  protected readonly refreshing = signal(true);
  protected readonly favoritePreloadRequestId = signal(0);
  protected readonly updatedAt = signal<Date | null>(null);
  private readonly currentTime = signal(new Date());
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
  constructor() {
    const clockInterval = window.setInterval(() => this.currentTime.set(new Date()), 60_000);
    this.destroyRef.onDestroy(() => window.clearInterval(clockInterval));
    if (!this.restoreFreshDrops()) this.loadDrops();
  }
  protected loadDrops(force = false): void { if (!force && this.hasFreshDrops()) return; const requestVersion = ++this.requestVersion; this.loading.set(true); this.refreshing.set(true); this.loadFailed.set(false); this.dropsProvider.loadActiveDrops().subscribe({ next: (drops) => { if (requestVersion !== this.requestVersion) return; this.applyDrops(drops, new Date()); this.saveDrops(drops); }, error: () => { if (requestVersion !== this.requestVersion) return; this.loadFailed.set(true); this.loading.set(false); this.refreshing.set(false); } }); }
  protected finishRefreshing(requestId: number): void { if (requestId === this.requestVersion) this.refreshing.set(false); }
  protected updatedLabel(): string {
    const updatedAt = this.updatedAt();
    const count = this.drops().length;
    if (!updatedAt) return 'Loading active Drops';

    const elapsedMinutes = Math.floor(Math.max(0, this.currentTime().getTime() - updatedAt.getTime()) / 60_000);
    const elapsedLabel = elapsedMinutes === 0 ? 'just now' : `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'} ago`;
    const loadedAt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(updatedAt);
    return `✓ Loaded ${count} drop${count === 1 ? '' : 's'} ${elapsedLabel}, at ${loadedAt}`;
  }
  private filterBySearchTerm(drops: readonly ActiveDrop[]): readonly ActiveDrop[] {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase();
    return searchTerm ? drops.filter((drop) => drop.gameName.toLocaleLowerCase().includes(searchTerm)) : drops;
  }
  private restoreFreshDrops(): boolean {
    try {
      const cachedDrops = JSON.parse(sessionStorage.getItem(DROPS_CACHE_KEY) ?? 'null') as CachedDrops | null;
      if (!cachedDrops || !Array.isArray(cachedDrops.drops) || !Number.isFinite(cachedDrops.updatedAt) || Date.now() - cachedDrops.updatedAt >= DROPS_CACHE_MAX_AGE_MS) return false;
      this.applyDrops(cachedDrops.drops, new Date(cachedDrops.updatedAt));
      return true;
    } catch {
      return false;
    }
  }
  private hasFreshDrops(): boolean {
    const updatedAt = this.updatedAt();
    return updatedAt !== null && Date.now() - updatedAt.getTime() < DROPS_CACHE_MAX_AGE_MS;
  }
  private applyDrops(drops: readonly ActiveDrop[], updatedAt: Date): void {
    const requestVersion = ++this.requestVersion;
    this.celebrations.reconcileActiveCampaigns(drops);
    this.changesState.updateDrops(drops);
    this.favoritePreloadRequestId.set(requestVersion);
    this.updatedAt.set(updatedAt);
    this.loading.set(false);
  }
  private saveDrops(drops: readonly ActiveDrop[]): void {
    try { sessionStorage.setItem(DROPS_CACHE_KEY, JSON.stringify({ drops, updatedAt: this.updatedAt()!.getTime() } satisfies CachedDrops)); } catch { /* Browser storage can be unavailable. */ }
  }
}
