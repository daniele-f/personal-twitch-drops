import { Injectable, signal } from '@angular/core';
import { TrackerMutation } from './tracker-mutation';

@Injectable({ providedIn: 'root' })
export class TrackerMutationDispatcherService {
  readonly mutations = signal<readonly TrackerMutation[]>([]);

  record(mutation: TrackerMutation): void { this.mutations.update((current) => [...current, mutation]); }
  clearRecorded(): void { this.mutations.set([]); }
  drain(): readonly TrackerMutation[] {
    const recorded = this.mutations();
    this.mutations.set([]);
    return recorded;
  }
}
