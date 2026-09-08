import { AppRoute } from '@/context/AppStoreContext';
import { PersistedAuthState } from './storage';

/**
 * Launch-time session rules.
 *
 * These are pure so the decisions can be tested directly — they were previously
 * implicit in App.tsx, which is why every relaunch replayed onboarding.
 */

/**
 * Which screen the app opens on, once the persisted session has resolved.
 *
 * A signed-in user goes straight to Home. Someone who has seen onboarding but
 * is signed out lands on Welcome rather than sitting through the slides again.
 * Only a genuinely first launch shows onboarding.
 */
export function resolveEntryRoute({
  isAuthenticated,
  hasSeenOnboarding,
}: {
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
}): AppRoute {
  if (isAuthenticated) return 'main-home';
  return hasSeenOnboarding ? 'welcome' : 'onboarding';
}

/**
 * Whether the user counts as signed in at launch.
 *
 * When Supabase is configured it is the single source of truth: an expired or
 * cleared session means signed out, regardless of what we cached locally — so a
 * stale flag can never grant access. The local flag only carries sign-in state
 * in offline/mock mode, where there is no session to consult.
 */
export function resolveAuthenticated({
  hasSupabaseEnv,
  hasSupabaseSession,
  persistedAuth,
}: {
  hasSupabaseEnv: boolean;
  hasSupabaseSession: boolean;
  persistedAuth: PersistedAuthState | null;
}): boolean {
  if (hasSupabaseEnv) return hasSupabaseSession;
  return persistedAuth === 'authenticated';
}
