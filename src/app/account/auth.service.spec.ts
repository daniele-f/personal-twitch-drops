import { TestBed } from '@angular/core/testing';
import { AuthService, SUPABASE_AUTH_CLIENT } from './auth.service';

describe('AuthService', () => {
  it('starts as a guest and exposes a signed-in user from an auth-state change', () => {
    let listener: ((event: string, session: { user: { id: string; email: string } } | null) => void) | undefined;
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: (callback: typeof listener) => {
          listener = callback;
          return { data: { subscription: { unsubscribe: () => undefined } } };
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }],
    });
    const service = TestBed.inject(AuthService);

    expect(service.status()).toBe('guest');
    expect(service.user()).toBeNull();

    listener?.('SIGNED_IN', { user: { id: 'user-123', email: 'viewer@example.test' } });

    expect(service.status()).toBe('authenticated');
    expect(service.user()).toEqual({ id: 'user-123', email: 'viewer@example.test' });
  });

  it('sends a password-reset email back to the current app origin', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        resetPasswordForEmail,
      },
    };
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }],
    });
    const service = TestBed.inject(AuthService);

    const result = await service.requestPasswordReset('viewer@example.test');

    expect(result.outcome).toBe('reset-email-sent');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('viewer@example.test', {
      redirectTo: globalThis.location.origin,
    });
  });

  it('keeps the password-recovery state when session restoration finishes afterward', async () => {
    let resolveSession: (value: { data: { session: { user: { id: string; email: string } } }; error: null }) => void;
    const session = new Promise<{ data: { session: { user: { id: string; email: string } } }; error: null }>((resolve) => { resolveSession = resolve; });
    let listener: ((event: string, session: { user: { id: string; email: string } } | null) => void) | undefined;
    const client = {
      auth: {
        getSession: () => session,
        onAuthStateChange: (callback: typeof listener) => {
          listener = callback;
          return { data: { subscription: { unsubscribe: () => undefined } } };
        },
      },
    };
    TestBed.configureTestingModule({ providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }] });
    const service = TestBed.inject(AuthService);

    listener?.('PASSWORD_RECOVERY', { user: { id: 'user-123', email: 'viewer@example.test' } });
    resolveSession!({ data: { session: { user: { id: 'user-123', email: 'viewer@example.test' } } }, error: null });
    await Promise.resolve();

    expect(service.status()).toBe('password-recovery');
  });
});
