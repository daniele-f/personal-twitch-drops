import { afterNextRender, ChangeDetectionStrategy, Component, effect, inject, Injector, input, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActiveDrop } from '../drops/active-drop';
import { DropDetails } from '../drops/drop-details';
import { DropsProvider } from '../drops/drops-provider';
import { DISPLAY_PREFERENCES_STORAGE_KEY, PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { CollectedRewardsService } from '../drops/collected-rewards.service';
import { CampaignCelebrationsService } from '../drops/campaign-celebrations.service';
import { CelebrationConfettiService } from '../drops/celebration-confetti.service';
import { ToggleComponent } from '../ui/toggle';
import { CollapseChevronComponent } from '../ui/collapse-chevron';
import { GameCardComponent } from '../ui/game-card';
import { DropCardComponent } from '../ui/drop-card';

@Component({
  selector: 'app-drop-list',
  templateUrl: './drop-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet, ToggleComponent, CollapseChevronComponent, GameCardComponent, DropCardComponent],
})
export class DropListComponent {
  private readonly dropsProvider = inject(DropsProvider);
  private readonly injector = inject(Injector);
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly collectedRewards = inject(CollectedRewardsService);
  private readonly celebrations = inject(CampaignCelebrationsService);
  private readonly confetti = inject(CelebrationConfettiService);
  readonly favoriteDrops = input.required<readonly ActiveDrop[]>();
  readonly activeDrops = input.required<readonly ActiveDrop[]>();
  readonly favoritePreloadRequestId = input(1);
  readonly loading = input.required<boolean>();
  readonly newDropIds = input<ReadonlySet<string>>(new Set());
  readonly updatedDropIds = input<ReadonlySet<string>>(new Set());
  readonly searchActive = input(false);
  readonly ignoredDropIds = input<ReadonlySet<string>>(new Set());
  readonly favoriteRequested = output<ActiveDrop>();
  readonly unfavoriteRequested = output<ActiveDrop>();
  readonly blacklistRequested = output<ActiveDrop>();
  readonly favoritePreloadComplete = output<number>();
  protected readonly expandedFavoriteId = signal<string | null>(null);
  protected readonly unfavoriteConfirmationId = signal<string | null>(null);
  protected readonly detailsByDropId = signal<ReadonlyMap<string, DropDetails>>(new Map());
  protected readonly loadingDetailIds = signal<ReadonlySet<string>>(new Set());
  protected readonly failedDetailIds = signal<ReadonlySet<string>>(new Set());
  private readonly detailSignaturesById = signal<ReadonlyMap<string, string>>(new Map());
  private readonly enrichedGameLinkIds = new Set<string>();
  private readonly pendingGameLinkDropsById = new Map<string, ActiveDrop>();
  private activeFavoritePreload: { readonly requestId: number; readonly pendingIds: Set<string> } | null = null;
  private lastFavoritePreloadRequestId = 0;
  private readonly displayPreferences = this.readDisplayPreferences();
  protected readonly showSubscriptions = signal(this.displayPreferences.showSubscriptions);
  protected readonly showBadges = signal(this.displayPreferences.showBadges);

  constructor() {
    effect(() => {
      const favoriteDrops = this.favoriteDrops();
      const activeDrops = this.activeDrops();
      const requestId = this.favoritePreloadRequestId();
      untracked(() => {
        this.ensureDetailsFor(activeDrops);
        this.refreshFavoriteDetailsFor(favoriteDrops, requestId);
      });
    });
  }

  protected activateStar(drop: ActiveDrop): void {
    this.favoriteRequested.emit(drop);
  }

  protected requestUnfavorite(drop: ActiveDrop): void {
    if (this.unfavoriteConfirmationId() === drop.id) {
      this.unfavoriteRequested.emit(drop);
      this.unfavoriteConfirmationId.set(null);
      return;
    }

    this.unfavoriteConfirmationId.set(drop.id);
  }

  protected cancelUnfavoriteConfirmation(drop: ActiveDrop): void {
    if (this.unfavoriteConfirmationId() === drop.id) this.unfavoriteConfirmationId.set(null);
  }

  protected cancelUnfavoriteOnPointerLeave(drop: ActiveDrop, event: PointerEvent): void {
    if (event.pointerType !== 'touch') this.cancelUnfavoriteConfirmation(drop);
  }

  protected blacklist(drop: ActiveDrop): void {
    this.blacklistRequested.emit(drop);
  }

  protected setShowSubscriptions(checked: boolean): void {
    this.showSubscriptions.set(checked);
    this.persistDisplayPreferences();
    this.restoreToggleFocus('show-subs');
  }

  protected setShowBadges(checked: boolean): void {
    this.showBadges.set(checked);
    this.persistDisplayPreferences();
    this.restoreToggleFocus('show-badges');
  }

  protected toggleFavoriteDetails(drop: ActiveDrop): void {
    if (this.expandedFavoriteId() === drop.id) {
      this.expandedFavoriteId.set(null);
      this.pendingGameLinkDropsById.delete(drop.id);
      return;
    }

    const previouslyExpandedId = this.expandedFavoriteId();
    if (previouslyExpandedId) this.pendingGameLinkDropsById.delete(previouslyExpandedId);
    this.expandedFavoriteId.set(drop.id);
    this.ensureDetailsFor([drop], true);
    this.scrollExpandedCardIntoView(drop.id);
  }

  private scrollExpandedCardIntoView(dropId: string): void {
    afterNextRender(() => this.scrollExpandedCardIntoViewNow(dropId), { injector: this.injector });
  }

  protected scrollExpandedCardAfterAnimation(dropId: string, event: AnimationEvent): void {
    if (event.target !== event.currentTarget || this.expandedFavoriteId() !== dropId) return;
    this.scrollExpandedCardIntoViewNow(dropId);
  }

  private scrollExpandedCardIntoViewNow(dropId: string): void {
    const details = [...document.querySelectorAll<HTMLElement>('.reward-details')].reverse().find((element) => element.id === `reward-details-${dropId}`);
    const card = details?.closest<HTMLElement>('li');
    if (!card || this.expandedFavoriteId() !== dropId || card.getBoundingClientRect().bottom <= window.innerHeight) return;
    const nextCard = card.nextElementSibling as HTMLElement | null;
    const gapAfterCard = nextCard ? Math.max(nextCard.getBoundingClientRect().top - card.getBoundingClientRect().bottom, 0) : 0;
    card.style.scrollMarginBottom = `${gapAfterCard}px`;
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    card.style.scrollMarginBottom = '';
  }

  protected visibleFavoriteDrops(): readonly ActiveDrop[] {
    return this.favoriteDrops().filter((drop) => this.isDropVisible(drop)).sort((left, right) => this.compareCampaigns(left, right));
  }

  protected visibleActiveDrops(): readonly ActiveDrop[] {
    return this.activeDrops().filter((drop) => this.isDropVisible(drop)).sort((left, right) => this.compareCampaigns(left, right));
  }

  protected hiddenGameCount(): number {
    return [...this.favoriteDrops(), ...this.activeDrops()].filter((drop) => !this.isDropVisible(drop)).length;
  }

  private ensureDetailsFor(drops: readonly ActiveDrop[], includeGameLinks = false, favoritePreloadRequestId?: number): void {
    const detailsById = this.detailsByDropId();
    const loadingIds = this.loadingDetailIds();
    const failedIds = this.failedDetailIds();
    const signaturesById = this.detailSignaturesById();
    for (const drop of drops) {
      const signature = this.detailsSignature(drop);
      const isCurrent = signaturesById.get(drop.id) === signature;
      const needsGameLinks = includeGameLinks && !this.enrichedGameLinkIds.has(drop.id);
      if ((detailsById.has(drop.id) || failedIds.has(drop.id)) && !isCurrent) {
        this.detailsByDropId.update((details) => { const next = new Map(details); next.delete(drop.id); return next; });
        this.failedDetailIds.update((ids) => { const next = new Set(ids); next.delete(drop.id); return next; });
      }
      if (needsGameLinks && loadingIds.has(drop.id)) {
        this.pendingGameLinkDropsById.set(drop.id, drop);
        continue;
      }
      if ((detailsById.has(drop.id) && isCurrent && !needsGameLinks) || loadingIds.has(drop.id) || (failedIds.has(drop.id) && isCurrent)) continue;
      this.loadDetails(drop, signature, needsGameLinks, favoritePreloadRequestId);
    }
  }

  private refreshFavoriteDetailsFor(drops: readonly ActiveDrop[], requestId: number): void {
    if (requestId === 0) return;
    const reloadDetails = requestId !== this.lastFavoritePreloadRequestId;
    if (reloadDetails) {
      this.lastFavoritePreloadRequestId = requestId;
      this.detailsByDropId.update((details) => {
        const next = new Map(details);
        drops.forEach((drop) => next.delete(drop.id));
        return next;
      });
    }
    this.failedDetailIds.set(new Set());
    this.activeFavoritePreload = { requestId, pendingIds: new Set(drops.map((drop) => drop.id)) };
    if (this.activeFavoritePreload.pendingIds.size === 0) {
      this.favoritePreloadComplete.emit(requestId);
      this.activeFavoritePreload = null;
      return;
    }
    this.ensureDetailsFor(drops, true, requestId);
    for (const drop of drops) {
      if (!this.loadingDetailIds().has(drop.id)) this.completeFavoritePreload(drop.id, requestId);
    }
  }

  private loadDetails(drop: ActiveDrop, signature: string, includeGameLinks = false, favoritePreloadRequestId?: number): void {

    this.loadingDetailIds.update((ids) => new Set(ids).add(drop.id));
    this.detailSignaturesById.update((signatures) => new Map(signatures).set(drop.id, signature));
    if (includeGameLinks) this.enrichedGameLinkIds.add(drop.id);
    const detailsRequest = includeGameLinks
      ? this.dropsProvider.loadDropDetails(drop.id, drop.gameName)
      : this.dropsProvider.loadDropDetails(drop.id);
    detailsRequest.subscribe({
      next: (details) => {
        this.detailsByDropId.update((detailsById) => new Map(detailsById).set(drop.id, details));
        if (includeGameLinks) this.logGameLinkResult(drop, details);
        if (this.expandedFavoriteId() === drop.id) this.scrollExpandedCardIntoView(drop.id);
      },
      error: () => {
        if (includeGameLinks) this.enrichedGameLinkIds.delete(drop.id);
        this.failedDetailIds.update((ids) => new Set(ids).add(drop.id));
        this.finishLoadingDetails(drop.id, false, favoritePreloadRequestId);
      },
      complete: () => this.finishLoadingDetails(drop.id, true, favoritePreloadRequestId),
    });
  }

  private logGameLinkResult(drop: ActiveDrop, details: DropDetails): void {
    const link = details.primaryLink;
    console.log(`[Game links] ${drop.gameName}: ${link ? `${link.label} — ${link.url}` : 'None'}`);
  }

  private finishLoadingDetails(id: string, startPendingGameLinkLookup = true, favoritePreloadRequestId?: number): void {
    this.loadingDetailIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(id);
      return nextIds;
    });
    this.completeFavoritePreload(id, favoritePreloadRequestId);
    if (!startPendingGameLinkLookup) return;

    const pendingDrop = this.pendingGameLinkDropsById.get(id);
    if (!pendingDrop) return;
    this.pendingGameLinkDropsById.delete(id);
    this.ensureDetailsFor([pendingDrop], true);
  }

  private completeFavoritePreload(id: string, requestId: number | undefined): void {
    if (requestId === undefined || this.activeFavoritePreload?.requestId !== requestId) return;
    this.activeFavoritePreload.pendingIds.delete(id);
    if (this.activeFavoritePreload.pendingIds.size === 0) {
      this.favoritePreloadComplete.emit(requestId);
      this.activeFavoritePreload = null;
    }
  }

  protected detailsFor(drop: ActiveDrop): DropDetails | undefined {
    return this.detailsByDropId().get(drop.id);
  }

  protected isLoadingDetails(drop: ActiveDrop): boolean {
    return this.loadingDetailIds().has(drop.id);
  }

  protected subscriptionRequirement(drop: ActiveDrop): string | undefined {
    return Object.values(this.detailsFor(drop)?.requirementByReward ?? {}).find((requirement) => requirement.includes('sub'));
  }

  protected rewardRequirement(drop: ActiveDrop, reward: string): string | undefined {
    const requirement = this.detailsFor(drop)?.requirementByReward[reward];
    return this.watchHours(requirement) === undefined ? requirement : `Watch ${requirement?.replace(/\s*watch/i, '')}`;
  }

  protected isBadgeReward(drop: ActiveDrop, reward: string): boolean {
    return this.detailsFor(drop)?.badgeRewardNames.includes(reward) ?? false;
  }

  protected visibleRewards(drop: ActiveDrop): readonly { readonly name: string; readonly imageUrl?: string }[] {
    return this.sortedRewards(drop).filter((reward) =>
      (this.showSubscriptions() || !this.isSubscriptionReward(drop, reward.name)) &&
      (this.showBadges() || !this.isBadgeReward(drop, reward.name)),
    );
  }

  protected hiddenRewardCount(drop: ActiveDrop): number {
    return this.sortedRewards(drop).length - this.visibleRewards(drop).length;
  }

  protected isRewardCollected(drop: ActiveDrop, rewardName: string): boolean {
    return this.collectedRewards.isCollected(drop.id, rewardName);
  }

  protected setRewardCollected(drop: ActiveDrop, rewardName: string, collected: boolean): void {
    this.collectedRewards.setCollected(drop.id, rewardName, collected);
    this.celebrateIfNewlyCompleted(drop);
  }

  protected toggleRewardCollected(drop: ActiveDrop, rewardName: string): void {
    this.setRewardCollected(drop, rewardName, !this.isRewardCollected(drop, rewardName));
  }

  protected allVisibleRewardsCollected(drop: ActiveDrop): boolean {
    const visibleRewardNames = this.visibleRewards(drop).map((reward) => reward.name);
    return !!visibleRewardNames.length && visibleRewardNames.every((rewardName) => this.isRewardCollected(drop, rewardName));
  }

  private allRewardsCollected(drop: ActiveDrop): boolean {
    return !!drop.rewards?.length && drop.rewards.every((rewardName) => this.isRewardCollected(drop, rewardName));
  }

  protected toggleAllCollected(drop: ActiveDrop): void {
    const rewardNames = this.visibleRewards(drop).map((reward) => reward.name);
    if (this.allVisibleRewardsCollected(drop)) this.collectedRewards.markNoneCollected(drop.id, rewardNames);
    else {
      this.collectedRewards.markAllCollected(drop.id, rewardNames);
      this.celebrateIfNewlyCompleted(drop);
    }
  }

  private celebrateIfNewlyCompleted(drop: ActiveDrop): void {
    const visibleRewardNames = this.visibleRewards(drop).map((reward) => reward.name);
    if (this.allRewardsCollected(drop) && this.celebrations.markCelebrated(drop.id, drop.rewards ?? [], 'complete')) {
      this.confetti.launch();
    } else if (visibleRewardNames.length && visibleRewardNames.every((rewardName) => this.isRewardCollected(drop, rewardName)) && this.celebrations.markCelebrated(drop.id, visibleRewardNames, 'visible')) {
      this.confetti.launch();
    }
  }

  private isDropVisible(drop: ActiveDrop): boolean {
    return this.searchActive() || this.isVisibleUnderRewardFilters(drop);
  }

  private isVisibleUnderRewardFilters(drop: ActiveDrop): boolean {
    return !drop.rewards?.length || !this.detailsFor(drop) || this.visibleRewards(drop).length > 0;
  }

  protected sortedRewards(drop: ActiveDrop): readonly { readonly name: string; readonly imageUrl?: string }[] {
    return (drop.rewards ?? []).map((name, index) => ({ name, imageUrl: drop.rewardImages?.[index] })).sort((left, right) => {
      const leftHours = this.watchHours(this.detailsFor(drop)?.requirementByReward[left.name]);
      const rightHours = this.watchHours(this.detailsFor(drop)?.requirementByReward[right.name]);
      if (leftHours === undefined) return rightHours === undefined ? 0 : 1;
      return rightHours === undefined ? -1 : leftHours - rightHours;
    });
  }

  private watchHours(requirement: string | undefined): number | undefined {
    const match = requirement?.match(/(\d+(?:\.\d+)?)\s*h\b/i);
    return match ? Number(match[1]) : undefined;
  }

  private isSubscriptionReward(drop: ActiveDrop, reward: string): boolean {
    return this.detailsFor(drop)?.requirementByReward[reward]?.toLocaleLowerCase().includes('sub') ?? false;
  }

  private detailsSignature(drop: ActiveDrop): string {
    return `${drop.startsAt ?? ''}\u0000${drop.endsAt}\u0000${(drop.rewards ?? []).join('\u0000')}`;
  }

  private restoreToggleFocus(id: string): void {
    afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
  }

  protected isIgnored(drop: ActiveDrop): boolean {
    return this.ignoredDropIds().has(drop.id);
  }

  protected isHiddenByRewardFilter(drop: ActiveDrop): boolean {
    return !this.isVisibleUnderRewardFilters(drop);
  }

  private readDisplayPreferences(): { readonly showSubscriptions: boolean; readonly showBadges: boolean } {
    if (!this.storage) return { showSubscriptions: false, showBadges: false };

    try {
      const stored = this.storage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY);
      const parsed: unknown = stored === null ? {} : JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { showSubscriptions: false, showBadges: false };
      const preferences = parsed as Record<string, unknown>;
      return { showSubscriptions: preferences['showSubscriptions'] === true, showBadges: preferences['showBadges'] === true };
    } catch {
      return { showSubscriptions: false, showBadges: false };
    }
  }

  private persistDisplayPreferences(): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, JSON.stringify({ showSubscriptions: this.showSubscriptions(), showBadges: this.showBadges() }));
    } catch {
      // Display preferences remain available for this browser session.
    }
  }

  protected remainingTime(drop: ActiveDrop): string {
    if (this.isUpcoming(drop)) return `${this.startingTime(drop)} — Ends in ${this.endingCountdown(drop)}`;
    const remainingMs = new Date(drop.endsAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Ended';
    const hours = Math.ceil(remainingMs / 3_600_000);
    return hours > 24 ? `${Math.ceil(hours / 24)}d left` : `${hours}h left`;
  }

  protected isUpcoming(drop: ActiveDrop): boolean {
    return !!drop.startsAt && new Date(drop.startsAt).getTime() > Date.now();
  }

  protected startsStartedCampaignGroup(drop: ActiveDrop, campaigns: readonly ActiveDrop[]): boolean {
    return campaigns.some((campaign) => this.isUpcoming(campaign))
      && campaigns.find((campaign) => !this.isUpcoming(campaign))?.id === drop.id;
  }

  protected startsUpcomingCampaignGroup(drop: ActiveDrop, campaigns: readonly ActiveDrop[]): boolean {
    return campaigns.some((campaign) => !this.isUpcoming(campaign))
      && campaigns.find((campaign) => this.isUpcoming(campaign))?.id === drop.id;
  }

  protected campaignDateTime(drop: ActiveDrop): string {
    return this.isUpcoming(drop) ? drop.startsAt! : drop.endsAt;
  }

  protected campaignTimeTitle(drop: ActiveDrop): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(this.campaignDateTime(drop)));
  }

  protected endTimeTitle(drop: ActiveDrop): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(drop.endsAt));
  }

  protected endDateLabel(drop: ActiveDrop): string {
    const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(drop.endsAt));
    return `Ends ${date}`;
  }

  private startingTime(drop: ActiveDrop): string {
    const remainingMinutes = Math.ceil((new Date(drop.startsAt!).getTime() - Date.now()) / 60_000);
    if (remainingMinutes <= 0) return 'Starting now';
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `Starts in ${hours ? `${hours}h ` : ''}${minutes}m`.trim();
  }

  private endingCountdown(drop: ActiveDrop): string {
    const hours = Math.ceil((new Date(drop.endsAt).getTime() - Date.now()) / 3_600_000);
    return hours > 24 ? `${Math.ceil(hours / 24)}d` : `${Math.max(hours, 0)}h`;
  }

  private compareCampaigns(left: ActiveDrop, right: ActiveDrop): number {
    const leftUpcoming = this.isUpcoming(left);
    const rightUpcoming = this.isUpcoming(right);
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;
    return Date.parse(leftUpcoming ? left.startsAt! : left.endsAt) - Date.parse(rightUpcoming ? right.startsAt! : right.endsAt);
  }

  protected rewardSummary(drop: ActiveDrop): string {
    const rewardLabel = drop.rewardCount === 1 ? 'reward' : 'rewards';
    const collectedCount = (drop.rewards ?? []).filter((rewardName) => this.isRewardCollected(drop, rewardName)).length;
    if (collectedCount) return `${collectedCount}/${drop.rewardCount} ${rewardLabel}`;
    return `${drop.rewardCount} ${rewardLabel}`;
  }

}
