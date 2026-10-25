import { Component, inject, input, output } from '@angular/core';
import { ButtonDirective } from '../ui/button.directive';
import { TrackerSyncService } from './tracker-sync.service';

@Component({ selector: 'app-sync-choice-dialog', imports: [ButtonDirective], templateUrl: './sync-choice-dialog.html', styleUrl: './account-dialog.scss' })
export class SyncChoiceDialogComponent {
  readonly opened = input.required<boolean>();
  readonly closed = output<void>();
  protected readonly trackerSync = inject(TrackerSyncService);
  protected async choose(source: 'browser' | 'account'): Promise<void> { if ((await this.trackerSync.chooseInitialSource(source)).status === 'synced') this.closed.emit(); }
}
