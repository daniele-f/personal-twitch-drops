import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ActiveDrop } from '../drops/active-drop';

@Component({
  selector: 'app-drop-list',
  templateUrl: './drop-list.html',
  styleUrl: './drop-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropListComponent {
  readonly drops = input.required<readonly ActiveDrop[]>();
  readonly loading = input.required<boolean>();

  protected summary(drop: ActiveDrop): string {
    const rewardLabel = drop.rewardCount === 1 ? 'reward' : 'rewards';
    const endDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(drop.endsAt),
    );

    return `${drop.rewardCount} ${rewardLabel} · Ends ${endDate}`;
  }
}
