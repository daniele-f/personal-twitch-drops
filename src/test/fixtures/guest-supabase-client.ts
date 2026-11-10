import { SUPABASE_AUTH_CLIENT } from '../../app/account/auth.service';

export const guestSupabaseClientProvider = {
  provide: SUPABASE_AUTH_CLIENT,
  useValue: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
};
