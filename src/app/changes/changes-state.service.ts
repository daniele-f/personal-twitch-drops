import { Injectable, signal } from '@angular/core';
import { ActiveDrop } from '../drops/active-drop';
import { detectChanges, DropChange } from './change-detection';

@Injectable({ providedIn: 'root' })
export class ChangesStateService {
  readonly drops = signal<readonly ActiveDrop[]>([]);
  readonly changes = signal<readonly DropChange[]>([]);
  private previous: readonly ActiveDrop[] | null = null;

  updateDrops(current: readonly ActiveDrop[]): void {
    if (this.previous !== null) this.changes.set(detectChanges(this.previous, current));
    this.previous = current;
    this.drops.set(current);
  }

  seed(previous: readonly ActiveDrop[], current: readonly ActiveDrop[]): readonly DropChange[] {
    this.previous = previous;
    this.updateDrops(current);
    return this.changes();
  }

  clear(): readonly DropChange[] { this.previous = null; this.drops.set([]); this.changes.set([]); return this.changes(); }
}
