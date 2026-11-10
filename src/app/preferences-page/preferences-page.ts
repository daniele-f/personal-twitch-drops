import { supabaseConfig } from '../../environments/supabase';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DropsProvider } from '../drops/drops-provider';
import { PreferencesService, ThemeColor } from '../preferences/preferences.service';
import { AuthService } from '../account/auth.service';
import { ButtonDirective } from '../ui/button.directive';
import { AccountDialogStateService } from '../account/account-dialog-state.service';

type ListStatusFilter = 'all' | 'active' | 'inactive';
type SettingsSection = 'games' | 'account' | 'appearance';
type GameList = 'favorites' | 'hidden';
type ListRow = { readonly id: string; readonly gameName: string };

@Component({ imports: [RouterLink, FormsModule, ButtonDirective], selector: 'app-preferences-page', templateUrl: './preferences-page.html' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  protected readonly auth = inject(AuthService);
  protected readonly accountEnabled = supabaseConfig.enabled;
  private readonly router = inject(Router);
  private readonly accountDialog = inject(AccountDialogStateService);
  private readonly dropsProvider = inject(DropsProvider);
  protected readonly favoriteRows = computed(() => [...this.preferences.favoriteIds()]
    .map((id) => ({ id, gameName: this.preferences.favoriteNames().get(id) ?? this.fallbackName(id) }))
    .sort((left, right) => left.gameName.localeCompare(right.gameName, undefined, { sensitivity: 'base' })));
  protected readonly ignoredRows = computed(() => [...this.preferences.blacklistEntries()]
    .sort((left, right) => left.gameName.localeCompare(right.gameName, undefined, { sensitivity: 'base' })));
  protected readonly favoriteSearch = signal('');
  protected readonly ignoredSearch = signal('');
  protected readonly favoriteStatusFilter = signal<ListStatusFilter>('all');
  protected readonly ignoredStatusFilter = signal<ListStatusFilter>('all');
  protected readonly filteredFavoriteRows = computed(() => this.filterRows(this.favoriteRows(), this.favoriteSearch(), this.favoriteStatusFilter()));
  protected readonly filteredIgnoredRows = computed(() => this.filterRows(this.ignoredRows(), this.ignoredSearch(), this.ignoredStatusFilter()));
  protected readonly selectedGameList = signal<GameList>('favorites');
  protected readonly activeDropIds = signal<ReadonlySet<string> | null>(null);
  protected readonly dropStatusUnavailable = signal(false);
  protected readonly armedFavoriteId = signal<string | null>(null);
  protected readonly armedForId = signal<string | null>(null);
  protected readonly unlinkArmed = signal(false);
  protected readonly emailToAdd = signal('');
  protected readonly newPassword = signal('');
  private readonly passwordDialog = viewChild<ElementRef<HTMLDialogElement>>('passwordDialog');
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSaving = signal(false);
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
  protected section(): SettingsSection {
    if (this.router.url.startsWith('/settings/account')) return 'account';
    if (this.router.url.startsWith('/settings/appearance')) return 'appearance';
    return 'games';
  }
  protected selectGameList(list: GameList): void {
    this.selectedGameList.set(list);
  }
  protected activeGameSearch(): string {
    return this.selectedGameList() === 'favorites' ? this.favoriteSearch() : this.ignoredSearch();
  }
  protected clearGameSearch(): void {
    if (this.selectedGameList() === 'favorites') this.favoriteSearch.set('');
    else this.ignoredSearch.set('');
  }
  protected campaignStatus(id: string): 'active' | 'inactive' | 'checking' { const activeIds = this.activeDropIds(); return activeIds === null ? 'checking' : activeIds.has(id) ? 'active' : 'inactive'; }
  protected isFilterActive(): boolean { return this.selectedGameList() === 'favorites' ? this.favoriteStatusFilter() !== 'all' : this.ignoredStatusFilter() !== 'all'; }
  protected openSignIn(): void { this.accountDialog.open(); }
  protected selectThemeColor(theme: ThemeColor): void { this.preferences.setThemeColor(theme); }
  protected removeFavorite(id: string): void { if (this.armedFavoriteId() === id) { this.preferences.removeFavorite(id); this.armedFavoriteId.set(null); } else this.armedFavoriteId.set(id); }
  protected cancelRemoveFavorite(id: string): void { if (this.armedFavoriteId() === id) this.armedFavoriteId.set(null); }
  private filterRows<T extends ListRow>(rows: readonly T[], query: string, statusFilter: ListStatusFilter): readonly T[] {
    const activeIds = this.activeDropIds();
    return rows.filter((row) => this.matchesFuzzyQuery(row.gameName, query) && (statusFilter === 'all' || activeIds === null || (statusFilter === 'active') === activeIds.has(row.id)));
  }
  private matchesFuzzyQuery(gameName: string, query: string): boolean {
    const queryCharacters = query.trim().toLocaleLowerCase();
    if (!queryCharacters) return true;
    let nextMatchAt = 0;
    for (const character of gameName.toLocaleLowerCase()) {
      if (character === queryCharacters[nextMatchAt]) nextMatchAt++;
      if (nextMatchAt === queryCharacters.length) return true;
    }
    return false;
  }
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
    if (this.passwordSaving()) return;
    if (!this.currentPassword() || this.newPassword().length < 8 || this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('Enter your current password and matching new passwords of at least 8 characters.');
      return;
    }
    this.passwordSaving.set(true);
    this.passwordError.set(null);
    try {
      const result = await this.auth.updatePassword(this.newPassword(), this.currentPassword());
      if (result.outcome === 'password-updated') {
        this.closePasswordDialog();
        this.accountMessage.set('Password updated.');
      } else this.passwordError.set(result.message ?? 'We could not update your password. Please try again.');
    } catch {
      this.passwordError.set('We could not update your password. Please try again.');
    } finally {
      this.passwordSaving.set(false);
    }
  }
  protected openPasswordDialog(): void {
    this.passwordError.set(null);
    // Keep extension-injected autofill menus outside the browser's modal top layer.
    this.passwordDialog()?.nativeElement.show();
  }
  protected closePasswordDialog(): void {
    this.passwordDialog()?.nativeElement.close();
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordError.set(null);
  }
}
