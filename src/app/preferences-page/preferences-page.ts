import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DropsProvider } from '../drops/drops-provider';
import { PreferencesService, ThemeColor } from '../preferences/preferences.service';
import { DisclosureComponent } from '../ui/disclosure';
import { StatusBadgeComponent } from '../ui/status-badge';
import { AuthService } from '../account/auth.service';
import { ButtonDirective } from '../ui/button.directive';

@Component({ imports: [RouterLink, FormsModule, ButtonDirective, DisclosureComponent, StatusBadgeComponent], selector: 'app-preferences-page', templateUrl: './preferences-page.html' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  protected readonly auth = inject(AuthService);
  private readonly dropsProvider = inject(DropsProvider);
  protected readonly favoriteRows = computed(() => [...this.preferences.favoriteIds()]
    .map((id) => ({ id, gameName: this.preferences.favoriteNames().get(id) ?? this.fallbackName(id) }))
    .sort((left, right) => left.gameName.localeCompare(right.gameName, undefined, { sensitivity: 'base' })));
  protected readonly ignoredRows = computed(() => [...this.preferences.blacklistEntries()]
    .sort((left, right) => left.gameName.localeCompare(right.gameName, undefined, { sensitivity: 'base' })));
  protected readonly favoritesExpanded = signal(false);
  protected readonly activeDropIds = signal<ReadonlySet<string> | null>(null);
  protected readonly dropStatusUnavailable = signal(false);
  protected readonly armedFavoriteId = signal<string | null>(null);
  protected readonly expanded = signal(false);
  protected readonly armedForId = signal<string | null>(null);
  protected readonly unlinkArmed = signal(false);
  protected readonly emailToAdd = signal('');
  protected readonly newPassword = signal('');
  protected readonly passwordDialogOpen = signal(false);
  protected readonly currentPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly accountMessage = signal<string | null>(null);
  protected readonly hasTwitch = computed(() => this.auth.identities()?.some((identity) => identity.provider === 'twitch') ?? false);
  protected readonly hasEmailIdentity = computed(() => this.auth.identities()?.some((identity) => identity.provider === 'email') ?? false);
  protected readonly canUnlinkTwitch = computed(() => (this.auth.identities()?.length ?? 0) > 1);
  constructor() {
    if (this.preferences.favoriteIds().size || this.preferences.blacklistEntries().length) {
      this.dropsProvider.loadActiveDrops().subscribe({
        next: (drops) => {
          this.activeDropIds.set(new Set(drops.map((drop) => drop.id)));
          this.preferences.rememberFavoriteNames(drops);
        },
        error: () => this.dropStatusUnavailable.set(true),
      });
    }
  }
  protected selectThemeColor(theme: ThemeColor): void { this.preferences.setThemeColor(theme); }
  protected removeFavorite(id: string): void { if (this.armedFavoriteId() === id) { this.preferences.removeFavorite(id); this.armedFavoriteId.set(null); } else this.armedFavoriteId.set(id); }
  protected cancelRemoveFavorite(id: string): void { if (this.armedFavoriteId() === id) this.armedFavoriteId.set(null); }
  private fallbackName(id: string): string { return (id.split('/').filter(Boolean).at(-1) || id).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
  protected remove(id: string): void { if (this.armedForId() === id) { this.preferences.removeBlacklist(id); this.armedForId.set(null); } else this.armedForId.set(id); }
  protected cancelRemove(id: string): void { if (this.armedForId() === id) this.armedForId.set(null); }
  protected async linkTwitch(): Promise<void> { await this.auth.linkTwitchIdentity(); }
  protected async unlinkTwitch(): Promise<void> {
    if (!this.unlinkArmed()) { this.unlinkArmed.set(true); return; }
    const result = await this.auth.unlinkTwitchIdentity();
    this.accountMessage.set(result.message ?? (result.outcome === 'signed-in' ? 'Twitch account unlinked.' : null));
    this.unlinkArmed.set(false);
  }
  protected async addEmail(): Promise<void> {
    const result = await this.auth.addEmail(this.emailToAdd().trim());
    this.accountMessage.set(result.outcome === 'confirmation-required' ? 'Check your email to confirm it, then return here to set a password.' : result.message ?? null);
  }
  protected async setPassword(): Promise<void> {
    if (!this.currentPassword() || this.newPassword() !== this.confirmPassword()) { this.accountMessage.set('Enter your current password and matching new passwords.'); return; }
    const result = await this.auth.updatePassword(this.newPassword(), this.currentPassword());
    this.accountMessage.set(result.outcome === 'password-updated' ? 'Password updated.' : result.message ?? null);
  }
}
