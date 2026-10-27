import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../environments/supabase';

export type AuthStatus = 'guest' | 'authenticating' | 'awaiting-confirmation' | 'password-recovery' | 'authenticated' | 'error';

export interface AccountUser {
  id: string;
  email: string | null;
}

export interface AuthResult {
  outcome: 'signed-in' | 'confirmation-required' | 'reset-email-sent' | 'password-updated' | 'error';
  message?: string;
}

export const SUPABASE_AUTH_CLIENT = new InjectionToken<SupabaseClient>('Supabase auth client', {
  factory: () => createClient(supabaseConfig.url, supabaseConfig.publishableKey),
});

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SUPABASE_AUTH_CLIENT);

  readonly user = signal<AccountUser | null>(null);
  readonly status = signal<AuthStatus>('guest');
  readonly error = signal<string | null>(null);

  constructor() {
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        this.user.set({ id: session.user.id, email: session.user.email ?? null });
        this.status.set('password-recovery');
        this.error.set(null);
        return;
      }
      this.applySession(session);
    });
    void this.restoreSession();
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    this.beginRequest();

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: globalThis.location?.origin },
      });

      if (error) return this.fail(error.message);
      if (data.session) {
        this.applySession(data.session);
        return { outcome: 'signed-in' };
      }

      this.status.set('awaiting-confirmation');
      return { outcome: 'confirmation-required' };
    } catch {
      return this.fail('We could not create your account. Please try again.');
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    this.beginRequest();

    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) return this.fail('Incorrect email or password.');

      this.applySession(data.session);
      return { outcome: 'signed-in' };
    } catch {
      return this.fail('We could not sign you in. Please try again.');
    }
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    this.beginRequest();

    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: globalThis.location?.origin,
      });
      if (error) return this.fail('We could not send a reset email. Please try again.');

      this.status.set('guest');
      return { outcome: 'reset-email-sent' };
    } catch {
      return this.fail('We could not send a reset email. Please try again.');
    }
  }

  async updatePassword(password: string): Promise<AuthResult> {
    this.beginRequest();

    try {
      const { error } = await this.client.auth.updateUser({ password });
      if (error) return this.fail('We could not update your password. Please try again.');

      this.status.set('authenticated');
      return { outcome: 'password-updated' };
    } catch {
      return this.fail('We could not update your password. Please try again.');
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      this.error.set('We could not sign you out. Please try again.');
      return;
    }

    this.applySession(null);
  }

  private async restoreSession(): Promise<void> {
    const { data } = await this.client.auth.getSession();
    if (this.status() !== 'password-recovery' && (data.session || this.status() === 'guest')) this.applySession(data.session);
  }

  private beginRequest(): void {
    this.status.set('authenticating');
    this.error.set(null);
  }

  private fail(message: string): AuthResult {
    this.status.set('error');
    this.error.set(message);
    return { outcome: 'error', message };
  }

  private applySession(session: Session | null): void {
    const user = session ? { id: session.user.id, email: session.user.email ?? null } : null;
    if (this.user()?.id !== user?.id || this.user()?.email !== user?.email) this.user.set(user);
    this.status.set(session ? 'authenticated' : 'guest');
    this.error.set(null);
  }
}
