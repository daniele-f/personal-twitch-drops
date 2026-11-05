import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonDirective } from '../ui/button.directive';
import { TrackerSyncService } from './tracker-sync.service';

@Component({ selector: 'app-sync-choice-dialog', imports: [ButtonDirective], templateUrl: './sync-choice-dialog.html', styleUrl: './account-dialog.scss' })
export class SyncChoiceDialogComponent {
  readonly opened = input.required<boolean>();
  readonly closed = output<void>();
  protected readonly trackerSync = inject(TrackerSyncService);
  protected readonly showDifferences = signal(false);
  protected toggleDifferences(): void { this.showDifferences.update((visible) => !visible); }
  protected async choose(source: 'browser' | 'account'): Promise<void> { if ((await this.trackerSync.chooseInitialSource(source)).status === 'synced') this.closed.emit(); }
}
