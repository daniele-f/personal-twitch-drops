import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({ selector: 'article[appGameCard]', host: { '[class.app-game-card]': 'true', '[class.app-game-card--expanded]': 'expanded()', '[attr.aria-label]': 'title()' }, templateUrl: './game-card.html', styleUrl: './game-card.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class GameCardComponent { readonly title = input.required<string>(); readonly imageUrl = input<string>(); readonly expanded = input(false); }
