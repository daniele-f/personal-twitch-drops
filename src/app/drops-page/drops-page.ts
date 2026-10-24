import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DropsProvider } from '../drops/drops-provider';
import { DropListComponent } from '../drop-list/drop-list';
import { PreferencesService } from '../preferences/preferences.service';
import { ChangesStateService } from '../changes/changes-state.service';
import { ActiveDrop } from '../drops/active-drop';
import { CollectedRewardsService } from '../drops/collected-rewards.service';
import { CampaignCelebrationsService } from '../drops/campaign-celebrations.service';
import { RefreshLoaderComponent } from '../ui/refresh-loader';
import { ButtonDirective } from '../ui/button.directive';
import { AuthService } from '../account/auth.service';
import { TrackerSyncService } from '../account/tracker-sync.service';

@Component({ imports: [ButtonDirective, DropListComponent, RefreshLoaderComponent], selector: 'app-drops-page', templateUrl: './drops-page.html' })
export class DropsPageComponent {
  private readonly dropsProvider = inject(DropsProvider);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changesState = inject(ChangesStateService);
  private readonly collectedRewards = inject(CollectedRewardsService);
  private readonly celebrations = inject(CampaignCelebrationsService);
  private readonly auth = inject(AuthService);
  private readonly trackerSync = inject(TrackerSyncService);
  protected readonly preferences = inject(PreferencesService);
  protected readonly drops = this.changesState.drops;
  protected readonly searchTerm = signal('');
  protected readonly searchActive = computed(() => this.searchTerm().trim().length > 0);
  protected readonly loading = signal(true);
  protected readonly initialLoading = computed(() => this.loading() || (this.auth.user() !== null && this.trackerSync.status() === 'syncing' && !this.trackerSync.readyForLocalChanges()));
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
    this.loadDrops();
  }
  protected loadDrops(): void { const requestVersion = ++this.requestVersion; this.loading.set(true); this.refreshing.set(true); this.loadFailed.set(false); this.dropsProvider.loadActiveDrops().subscribe({ next: (drops) => { if (requestVersion !== this.requestVersion) return; this.collectedRewards.retainActiveCampaigns(drops.map((drop) => drop.id)); this.celebrations.reconcileActiveCampaigns(drops); this.changesState.updateDrops(drops); this.favoritePreloadRequestId.set(requestVersion); this.updatedAt.set(new Date()); this.loading.set(false); }, error: () => { if (requestVersion !== this.requestVersion) return; this.loadFailed.set(true); this.loading.set(false); this.refreshing.set(false); } }); }
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
}
