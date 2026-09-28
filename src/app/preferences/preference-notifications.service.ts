import { Injectable, signal } from '@angular/core';

export type PreferenceNotificationKind = 'favorite-added' | 'favorite-removed' | 'ignored-added' | 'ignored-removed';

export interface PreferenceNotification {
  readonly id: number;
  readonly kind: PreferenceNotificationKind;
  readonly gameName: string;
}

@Injectable({ providedIn: 'root' })
export class PreferenceNotificationsService {
  readonly notifications = signal<readonly PreferenceNotification[]>([]);
  readonly queuedCount = signal(0);
  private nextId = 0;
  private readonly queue: PreferenceNotification[] = [];
  private readonly dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();

  show(kind: PreferenceNotificationKind, gameName: string): void {
    const notification = { id: ++this.nextId, kind, gameName };
    if (this.notifications().length < 6) this.showNow(notification);
    else { this.queue.push(notification); this.queuedCount.set(this.queue.length); }
  }

  dismiss(id: number): void {
    const timer = this.dismissTimers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    this.dismissTimers.delete(id);
    this.notifications.update((current) => current.filter((notification) => notification.id !== id));
    const next = this.queue.shift();
    this.queuedCount.set(this.queue.length);
    if (next) this.showNow(next);
  }

  clearAll(): void {
    for (const timer of this.dismissTimers.values()) clearTimeout(timer);
    this.dismissTimers.clear();
    this.queue.length = 0;
    this.queuedCount.set(0);
    this.notifications.set([]);
  }

  private showNow(notification: PreferenceNotification): void {
    this.notifications.update((current) => [...current, notification]);
    this.dismissTimers.set(notification.id, setTimeout(() => this.dismiss(notification.id), 3000));
  }
}
