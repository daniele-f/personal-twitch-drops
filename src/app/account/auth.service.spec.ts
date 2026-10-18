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
});
