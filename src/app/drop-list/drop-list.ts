import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ActiveDrop } from '../drops/active-drop';
import { DropDetails } from '../drops/drop-details';
import { DropsProvider } from '../drops/drops-provider';

@Component({
  selector: 'app-drop-list',
  templateUrl: './drop-list.html',
  styleUrl: './drop-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropListComponent {
  private readonly dropsProvider = inject(DropsProvider);
  readonly favoriteDrops = input.required<readonly ActiveDrop[]>();
  readonly activeDrops = input.required<readonly ActiveDrop[]>();
  readonly loading = input.required<boolean>();
  readonly newDropIds = input<ReadonlySet<string>>(new Set());
  readonly updatedDropIds = input<ReadonlySet<string>>(new Set());
  readonly favoriteRequested = output<ActiveDrop>();
  readonly unfavoriteRequested = output<string>();
  readonly blacklistRequested = output<ActiveDrop>();
  protected readonly armedForId = signal<string | null>(null);
  protected readonly expandedFavoriteId = signal<string | null>(null);
  protected readonly detailsByDropId = signal<ReadonlyMap<string, DropDetails>>(new Map());
  protected readonly loadingDetailIds = signal<ReadonlySet<string>>(new Set());

  protected activateStar(drop: ActiveDrop, isFavorite: boolean): void {
    if (!isFavorite) {
      this.favoriteRequested.emit(drop);
      return;
    }
    if (this.armedForId() === drop.id) {
      this.unfavoriteRequested.emit(drop.id);
      this.armedForId.set(null);
      return;
    }
    this.armedForId.set(drop.id);
  }

  protected cancelArmed(id: string): void {
    if (this.armedForId() === id) this.armedForId.set(null);
  }

  protected blacklist(drop: ActiveDrop): void {
    this.blacklistRequested.emit(drop);
  }

  protected toggleFavoriteDetails(drop: ActiveDrop): void {
    if (this.expandedFavoriteId() === drop.id) {
      this.expandedFavoriteId.set(null);
      return;
    }

    this.expandedFavoriteId.set(drop.id);
    if (this.detailsByDropId().has(drop.id) || this.loadingDetailIds().has(drop.id)) return;

    this.loadingDetailIds.update((ids) => new Set(ids).add(drop.id));
    this.dropsProvider.loadDropDetails(drop.id).subscribe({
      next: (details) => this.detailsByDropId.update((detailsById) => new Map(detailsById).set(drop.id, details)),
      error: () => this.finishLoadingDetails(drop.id),
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
