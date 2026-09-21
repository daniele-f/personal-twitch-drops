import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ActiveDrop } from './drops/active-drop';
import { DropsProvider } from './drops/drops-provider';
import { DropListComponent } from './drop-list/drop-list';

@Component({
  imports: [DropListComponent, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly dropsProvider = inject(DropsProvider);

  protected readonly drops = signal<readonly ActiveDrop[]>([]);
  protected readonly loading = signal(true);
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly loadFailed = signal(false);
  private requestVersion = 0;

  constructor() {
    this.loadDrops();
  }

  protected loadDrops(): void {
    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.loadFailed.set(false);
    this.drops.set([]);

    this.dropsProvider.loadActiveDrops().subscribe({
      next: (drops) => {
        if (requestVersion !== this.requestVersion) return;
        this.drops.set(drops);
        this.updatedAt.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        if (requestVersion !== this.requestVersion) return;
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected updatedLabel(): string {
    const updatedAt = this.updatedAt();
    return updatedAt ? `Updated ${new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(updatedAt)}` : 'Loading active Drops';
  }
}
