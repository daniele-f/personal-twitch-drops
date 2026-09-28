import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({ selector: 'app-drop-card', templateUrl: './drop-card.html', styleUrl: './drop-card.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class DropCardComponent { readonly title = input.required<string>(); readonly timeLabel = input.required<string>(); readonly rewardSummary = input.required<string>(); readonly imageUrl = input<string>(); readonly expanded = input(false); }
