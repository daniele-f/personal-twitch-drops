import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({ selector: 'app-game-card', templateUrl: './game-card.html', styleUrl: './game-card.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class GameCardComponent { readonly title = input.required<string>(); readonly imageUrl = input<string>(); readonly expanded = input(false); }
