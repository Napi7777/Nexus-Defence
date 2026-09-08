/**
 * The shared Supabase client. Every other module in this folder talks to the
 * backend through the `supabase` export here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

let _clientInstance: any = null;

export function isSupabaseKeyValid(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed === 'your-anon-key' ||
    trimmed === 'YOUR_SUPABASE_ANON_KEY'
  ) {
    return false;
  }
  return true;
}

export function getSupabaseClient() {
  // Every data call starts here, so return the built client before re-reading
  // and re-validating the environment. The env is only consulted until a client
  // exists, which keeps the lazy behaviour tests rely on.
  if (_clientInstance) return _clientInstance;

  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').trim();
  const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !isSupabaseKeyValid(supabaseAnonKey)) {
    return null;
  }

  // React Native has no localStorage, so without an explicit adapter
  // supabase-js cannot persist the session and every relaunch starts signed
  // out. AsyncStorage is what makes "stay logged in" work at all.
  _clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Sessions never arrive via a URL fragment on native.
      detectSessionInUrl: false,
    },
  });
  startAutoRefreshBridge();
  return _clientInstance;
}

let _autoRefreshBridged = false;

/**
 * Supabase's recommended React Native pattern: only refresh tokens while the
 * app is foregrounded, so a backgrounded app does not burn timers or race the
 * OS suspending it mid-request.
 */
function startAutoRefreshBridge() {
  if (_autoRefreshBridged || Platform.OS === 'web') return;
  _autoRefreshBridged = true;

  AppState.addEventListener('change', (status) => {
    if (!_clientInstance) return;
    if (status === 'active') {
      _clientInstance.auth.startAutoRefresh();
    } else {
      _clientInstance.auth.stopAutoRefresh();
    }
  });
}

export const supabase = getSupabaseClient();
export const hasSupabaseEnv = Boolean(
  (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim() &&
  isSupabaseKeyValid((process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim())
);
