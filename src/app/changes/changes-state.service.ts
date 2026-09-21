import { Injectable, signal } from '@angular/core';
import { ActiveDrop } from '../drops/active-drop';
import { detectChanges, DropChange } from './change-detection';

@Injectable({ providedIn: 'root' })
export class ChangesStateService {
  readonly changes = signal<readonly DropChange[]>([]);
  private previous: readonly ActiveDrop[] | null = null;

  updateDrops(current: readonly ActiveDrop[]): void {
    if (this.previous !== null) this.changes.set(detectChanges(this.previous, current));
    this.previous = current;
  }
}
