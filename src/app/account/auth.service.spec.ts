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

  it('preserves the signed-in user when a token refresh reports the same account', () => {
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
    TestBed.configureTestingModule({ providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }] });
    const service = TestBed.inject(AuthService);
    listener?.('SIGNED_IN', { user: { id: 'user-123', email: 'viewer@example.test' } });
    const signedInUser = service.user();

    listener?.('TOKEN_REFRESHED', { user: { id: 'user-123', email: 'viewer@example.test' } });

    expect(service.user()).toBe(signedInUser);
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

  it('starts Twitch OAuth with the current app as the return URL', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { provider: 'twitch', url: 'https://id.twitch.tv/oauth2/authorize' }, error: null });
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        signInWithOAuth,
      },
    };
    TestBed.configureTestingModule({ providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }] });
    const service = TestBed.inject(AuthService);

    const result = await service.signInWithTwitch();

    expect(result).toEqual({ outcome: 'redirect-started' });
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'twitch', options: { redirectTo: globalThis.location.origin } });
  });

  it('starts Twitch identity linking with the current app as the return URL', async () => {
    const linkIdentity = vi.fn().mockResolvedValue({ data: { provider: 'twitch', url: 'https://id.twitch.tv/oauth2/authorize' }, error: null });
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        linkIdentity,
      },
    };
    TestBed.configureTestingModule({ providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }] });
    const service = TestBed.inject(AuthService);

    const result = await service.linkTwitchIdentity();

    expect(result).toEqual({ outcome: 'redirect-started' });
    expect(linkIdentity).toHaveBeenCalledWith({ provider: 'twitch', options: { redirectTo: globalThis.location.origin } });
  });

  it('reports a Twitch OAuth error without changing the authenticated user', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { provider: 'twitch', url: null }, error: { message: 'Twitch is unavailable' } });
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        signInWithOAuth,
      },
    };
    TestBed.configureTestingModule({ providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }] });
    const service = TestBed.inject(AuthService);

    const result = await service.signInWithTwitch();

    expect(result).toEqual({ outcome: 'error', message: 'We could not start Twitch sign-in. Please try again.' });
    expect(service.user()).toBeNull();
    expect(service.error()).toBe('We could not start Twitch sign-in. Please try again.');
  });

  it('reports a Twitch link error', async () => {
    const linkIdentity = vi.fn().mockResolvedValue({ data: { provider: 'twitch', url: null }, error: { message: 'Identity already linked' } });
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        linkIdentity,
      },
    };
    TestBed.configureTestingModule({ providers: [AuthService, { provide: SUPABASE_AUTH_CLIENT, useValue: client }] });
    const service = TestBed.inject(AuthService);

    const result = await service.linkTwitchIdentity();

    expect(result).toEqual({ outcome: 'error', message: 'We could not link your Twitch account. Please try again.' });
    expect(service.error()).toBe('We could not link your Twitch account. Please try again.');
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
