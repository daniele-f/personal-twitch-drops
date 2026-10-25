import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from '../ui/button.directive';
import { AuthService } from './auth.service';
import { TrackerSyncService } from './tracker-sync.service';

@Component({
  selector: 'app-account-dialog',
  imports: [FormsModule, ButtonDirective],
  templateUrl: './account-dialog.html',
  styleUrl: './account-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDialogComponent {
  readonly opened = input.required<boolean>();
  readonly closed = output<void>();
  protected readonly auth = inject(AuthService);
  protected readonly trackerSync = inject(TrackerSyncService);
  protected readonly mode = signal<'sign-in' | 'sign-up' | 'request-reset'>('sign-in');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly resetEmailSent = signal(false);
  protected readonly passwordUpdated = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected async submit(): Promise<void> {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) return;
    const result = this.mode() === 'sign-up'
      ? await this.auth.signUp(email, password)
      : await this.auth.signIn(email, password);
    if (result.outcome === 'signed-in') this.closed.emit();
  }

  protected async requestPasswordReset(): Promise<void> {
    const email = this.email().trim();
    if (!email) return;
    const result = await this.auth.requestPasswordReset(email);
    if (result.outcome === 'reset-email-sent') this.resetEmailSent.set(true);
  }

  protected async updatePassword(): Promise<void> {
    if (!this.password() || this.password() !== this.confirmPassword()) {
      this.localError.set('Enter the same new password twice.');
      return;
    }
    this.localError.set(null);
    const result = await this.auth.updatePassword(this.password());
    if (result.outcome === 'password-updated') this.passwordUpdated.set(true);
  }

  protected selectMode(mode: 'sign-in' | 'sign-up' | 'request-reset'): void {
    this.mode.set(mode);
    this.resetEmailSent.set(false);
    this.localError.set(null);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.closed.emit();
  }

  protected async retrySync(): Promise<void> {
    await this.trackerSync.retryPending();
  }
}
