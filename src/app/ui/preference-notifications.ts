import { Component, inject } from '@angular/core';
import { PreferenceNotification, PreferenceNotificationsService } from '../preferences/preference-notifications.service';

@Component({ selector: 'app-preference-notifications', templateUrl: './preference-notifications.html', styleUrl: './preference-notifications.scss' })
export class PreferenceNotificationsComponent {
  private readonly preferenceNotifications = inject(PreferenceNotificationsService);
  protected readonly notifications = this.preferenceNotifications.notifications;
  protected readonly queuedCount = this.preferenceNotifications.queuedCount;
  protected message(notification: PreferenceNotification): string {
    const action = notification.kind === 'favorite-added' ? 'added to Favorites' : notification.kind === 'favorite-removed' ? 'removed from Favorites' : notification.kind === 'ignored-added' ? 'added to Ignore List' : 'removed from Ignore List';
    return `${notification.gameName} ${action}`;
  }
  protected icon(notification: PreferenceNotification): string { return notification.kind.startsWith('favorite') ? '♥' : '⊘'; }
  protected dismiss(id: number): void { this.preferenceNotifications.dismiss(id); }
  protected clearAll(): void { this.preferenceNotifications.clearAll(); }
}
