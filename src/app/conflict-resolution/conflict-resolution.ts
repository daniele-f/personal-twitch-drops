import { Component, input, output } from '@angular/core';
import { BlacklistEntry } from '../preferences/blacklist-entry';

@Component({ selector: 'app-conflict-resolution', templateUrl: './conflict-resolution.html', styleUrl: './conflict-resolution.scss' })
export class ConflictResolutionComponent {
  readonly conflicts = input.required<readonly BlacklistEntry[]>();
  readonly keepFavoriteRequested = output<string>();
  readonly hideRequested = output<string>();
}
