// Unit tests use mocks. This reserved domain keeps the test build isolated from live projects.
export const supabaseConfig = {
  enabled: true,
  url: 'https://supabase.example.invalid',
  publishableKey: 'test-publishable-key',
} as const;
