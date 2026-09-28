import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({ selector: 'article[appDropCard]', host: { '[class.app-drop-card]': 'true', '[class.app-drop-card--expanded]': 'expanded()', '[attr.aria-label]': 'title()' }, templateUrl: './drop-card.html', styleUrl: './drop-card.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class DropCardComponent { readonly title = input.required<string>(); readonly timeLabel = input.required<string>(); readonly rewardSummary = input.required<string>(); readonly imageUrl = input<string>(); readonly expanded = input(false); }
