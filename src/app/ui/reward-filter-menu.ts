import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-reward-filter-menu',
  templateUrl: './reward-filter-menu.html',
  styleUrl: './reward-filter-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardFilterMenuComponent {
  readonly showSubscriptions = input.required<boolean>();
  readonly showBadges = input.required<boolean>();
  readonly showEmotes = input.required<boolean>();
  readonly hiddenGameCount = input.required<number>();
  readonly hiddenRewardCount = input.required<number>();
  readonly showSubscriptionsChange = output<boolean>();
  readonly showBadgesChange = output<boolean>();
  readonly showEmotesChange = output<boolean>();
  protected readonly open = signal(false);
  protected readonly activeFilterCount = computed(() => Number(this.showSubscriptions()) + Number(this.showBadges()) + Number(this.showEmotes()));
  @ViewChild('trigger') private readonly trigger?: ElementRef<HTMLButtonElement>;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  protected toggle(): void { this.open.update((open) => !open); }

  focusTrigger(): void { this.trigger?.nativeElement.focus(); }

  protected setShowSubscriptions(checked: boolean): void { this.showSubscriptionsChange.emit(checked); }

  protected setShowBadges(checked: boolean): void { this.showBadgesChange.emit(checked); }

  protected setShowEmotes(checked: boolean): void { this.showEmotesChange.emit(checked); }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    if (event.target instanceof Node && !this.elementRef.nativeElement.contains(event.target)) this.close();
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void { this.close(true); }

  private close(restoreFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.trigger?.nativeElement.focus();
  }
}
