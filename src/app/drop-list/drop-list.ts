import { afterNextRender, ChangeDetectionStrategy, Component, effect, inject, Injector, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActiveDrop } from '../drops/active-drop';
import { DropDetails } from '../drops/drop-details';
import { DropsProvider } from '../drops/drops-provider';

@Component({
  selector: 'app-drop-list',
  templateUrl: './drop-list.html',
  styleUrl: './drop-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class DropListComponent {
  private readonly dropsProvider = inject(DropsProvider);
  private readonly injector = inject(Injector);
  readonly favoriteDrops = input.required<readonly ActiveDrop[]>();
  readonly activeDrops = input.required<readonly ActiveDrop[]>();
  readonly loading = input.required<boolean>();
  readonly newDropIds = input<ReadonlySet<string>>(new Set());
  readonly updatedDropIds = input<ReadonlySet<string>>(new Set());
  readonly favoriteRequested = output<ActiveDrop>();
  readonly blacklistRequested = output<ActiveDrop>();
  protected readonly expandedFavoriteId = signal<string | null>(null);
  protected readonly detailsByDropId = signal<ReadonlyMap<string, DropDetails>>(new Map());
  protected readonly loadingDetailIds = signal<ReadonlySet<string>>(new Set());
  protected readonly failedDetailIds = signal<ReadonlySet<string>>(new Set());
  private readonly detailSignaturesById = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly showSubscriptions = signal(false);
  protected readonly showBadges = signal(false);

  constructor() {
    effect(() => {
      const drops = [...this.favoriteDrops(), ...this.activeDrops()];
      untracked(() => this.refreshDetailsFor(drops));
    });
  }

  protected activateStar(drop: ActiveDrop): void {
    this.favoriteRequested.emit(drop);
  }

  protected blacklist(drop: ActiveDrop): void {
    this.blacklistRequested.emit(drop);
  }

  protected setShowSubscriptions(checked: boolean): void {
    this.showSubscriptions.set(checked);
    this.restoreToggleFocus('show-subs');
  }

  protected setShowBadges(checked: boolean): void {
    this.showBadges.set(checked);
    this.restoreToggleFocus('show-badges');
  }

  protected toggleFavoriteDetails(drop: ActiveDrop): void {
    if (this.expandedFavoriteId() === drop.id) {
      this.expandedFavoriteId.set(null);
      return;
    }

    this.expandedFavoriteId.set(drop.id);
    this.ensureDetailsFor([drop]);
  }

  protected visibleFavoriteDrops(): readonly ActiveDrop[] {
    return this.favoriteDrops().filter((drop) => this.isDropVisible(drop));
  }

  protected visibleActiveDrops(): readonly ActiveDrop[] {
    return this.activeDrops().filter((drop) => this.isDropVisible(drop));
  }

  private ensureDetailsFor(drops: readonly ActiveDrop[]): void {
    const detailsById = this.detailsByDropId();
    const loadingIds = this.loadingDetailIds();
    const failedIds = this.failedDetailIds();
    const signaturesById = this.detailSignaturesById();
    for (const drop of drops) {
      const signature = this.detailsSignature(drop);
      const isCurrent = signaturesById.get(drop.id) === signature;
      if ((detailsById.has(drop.id) || failedIds.has(drop.id)) && !isCurrent) {
        this.detailsByDropId.update((details) => { const next = new Map(details); next.delete(drop.id); return next; });
        this.failedDetailIds.update((ids) => { const next = new Set(ids); next.delete(drop.id); return next; });
      }
      if ((detailsById.has(drop.id) && isCurrent) || loadingIds.has(drop.id) || (failedIds.has(drop.id) && isCurrent)) continue;
      this.loadDetails(drop, signature);
    }
  }

  private refreshDetailsFor(drops: readonly ActiveDrop[]): void {
    this.failedDetailIds.set(new Set());
    this.ensureDetailsFor(drops);
  }

  private loadDetails(drop: ActiveDrop, signature: string): void {

    this.loadingDetailIds.update((ids) => new Set(ids).add(drop.id));
    this.detailSignaturesById.update((signatures) => new Map(signatures).set(drop.id, signature));
    this.dropsProvider.loadDropDetails(drop.id).subscribe({
      next: (details) => this.detailsByDropId.update((detailsById) => new Map(detailsById).set(drop.id, details)),
      error: () => { this.failedDetailIds.update((ids) => new Set(ids).add(drop.id)); this.finishLoadingDetails(drop.id); },
      complete: () => this.finishLoadingDetails(drop.id),
    });
  }

  private finishLoadingDetails(id: string): void {
    this.loadingDetailIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(id);
      return nextIds;
    });
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

  private isDropVisible(drop: ActiveDrop): boolean {
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
    return `${drop.endsAt}\u0000${(drop.rewards ?? []).join('\u0000')}`;
  }

  private restoreToggleFocus(id: string): void {
    afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
  }

  protected remainingTime(drop: ActiveDrop): string {
    const remainingMs = new Date(drop.endsAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Ended';
    const hours = Math.ceil(remainingMs / 3_600_000);
    return hours > 24 ? `${Math.ceil(hours / 24)}d left` : `${hours}h left`;
  }

  protected exactEndTime(drop: ActiveDrop): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(drop.endsAt));
  }

  protected summary(drop: ActiveDrop): string {
    const rewardLabel = drop.rewardCount === 1 ? 'reward' : 'rewards';
    const endDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(drop.endsAt),
    );

    return `${drop.rewardCount} ${rewardLabel} · Ends ${endDate}`;
  }
}
