import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from '../ui/button.directive';
import { AuthService } from './auth.service';

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
  protected readonly mode = signal<'sign-in' | 'sign-up'>('sign-up');
  protected readonly email = signal('');
  protected readonly password = signal('');

  protected async submit(): Promise<void> {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) return;
    if (this.mode() === 'sign-up') await this.auth.signUp(email, password);
    else await this.auth.signIn(email, password);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.closed.emit();
  }
}
