import { resolveAuthenticated, resolveEntryRoute } from '@/lib/session';

describe('resolveEntryRoute', () => {
  it('sends a signed-in user straight to Home', () => {
    expect(resolveEntryRoute({ isAuthenticated: true, hasSeenOnboarding: true })).toBe('main-home');
  });

  it('skips onboarding for a signed-in user who somehow never saw it', () => {
    expect(resolveEntryRoute({ isAuthenticated: true, hasSeenOnboarding: false })).toBe('main-home');
  });

  it('sends a returning signed-out user to Welcome, not back through onboarding', () => {
    expect(resolveEntryRoute({ isAuthenticated: false, hasSeenOnboarding: true })).toBe('welcome');
  });

  it('shows onboarding only on a genuine first launch', () => {
    expect(resolveEntryRoute({ isAuthenticated: false, hasSeenOnboarding: false })).toBe('onboarding');
  });
});

describe('resolveAuthenticated', () => {
  it('trusts the Supabase session when Supabase is configured', () => {
    expect(
      resolveAuthenticated({ hasSupabaseEnv: true, hasSupabaseSession: true, persistedAuth: null })
    ).toBe(true);
  });

  it('does not let a stale local flag grant access once the session is gone', () => {
    // Signing out elsewhere, or an expired refresh token, must log the user out
    // even though the device still has 'authenticated' cached.
    expect(
      resolveAuthenticated({
        hasSupabaseEnv: true,
        hasSupabaseSession: false,
        persistedAuth: 'authenticated',
      })
    ).toBe(false);
  });

  it('falls back to the local flag in offline/mock mode', () => {
    expect(
      resolveAuthenticated({
        hasSupabaseEnv: false,
        hasSupabaseSession: false,
        persistedAuth: 'authenticated',
      })
    ).toBe(true);
  });

  it('treats a guest flag and a missing flag as signed out', () => {
    expect(
      resolveAuthenticated({ hasSupabaseEnv: false, hasSupabaseSession: false, persistedAuth: 'guest' })
    ).toBe(false);
    expect(
      resolveAuthenticated({ hasSupabaseEnv: false, hasSupabaseSession: false, persistedAuth: null })
    ).toBe(false);
  });
});
