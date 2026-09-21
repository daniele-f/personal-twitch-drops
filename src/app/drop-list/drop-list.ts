import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ActiveDrop } from '../drops/active-drop';

@Component({
  selector: 'app-drop-list',
  templateUrl: './drop-list.html',
  styleUrl: './drop-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropListComponent {
  readonly favoriteDrops = input.required<readonly ActiveDrop[]>();
  readonly activeDrops = input.required<readonly ActiveDrop[]>();
  readonly loading = input.required<boolean>();
  readonly favoriteRequested = output<string>();
  readonly unfavoriteRequested = output<string>();
  protected readonly armedForId = signal<string | null>(null);

  protected activateStar(drop: ActiveDrop, isFavorite: boolean): void {
    if (!isFavorite) {
      this.favoriteRequested.emit(drop.id);
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

  protected summary(drop: ActiveDrop): string {
    const rewardLabel = drop.rewardCount === 1 ? 'reward' : 'rewards';
    const endDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(drop.endsAt),
    );

    return `${drop.rewardCount} ${rewardLabel} · Ends ${endDate}`;
  }
}
