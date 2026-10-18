import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../environments/supabase';

export type AuthStatus = 'guest' | 'authenticating' | 'awaiting-confirmation' | 'authenticated' | 'error';

export interface AccountUser {
  id: string;
  email: string | null;
}

export interface AuthResult {
  outcome: 'signed-in' | 'confirmation-required' | 'error';
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
    this.client.auth.onAuthStateChange((_event, session) => this.applySession(session));
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
    if (data.session || this.status() === 'guest') this.applySession(data.session);
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
    this.user.set(session ? { id: session.user.id, email: session.user.email ?? null } : null);
    this.status.set(session ? 'authenticated' : 'guest');
    this.error.set(null);
  }
}
