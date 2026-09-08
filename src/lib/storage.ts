import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommunityItem, InPersonMeetup, NotificationPrefs, Review, SessionItem, UserProfile } from '@/data/mockData';
import { ActivityLog, ThemeMode } from '@/context/AppStoreContext';

const KEYS = {
  THEME: '@nexus_theme',
  PROFILE: '@nexus_user_profile',
  NOTIFICATIONS: '@nexus_notification_prefs',
  COMMUNITIES: '@nexus_communities_cache',
  MEETUPS: '@nexus_meetups_cache',
  SESSIONS: '@nexus_sessions_cache',
  REVIEWS: '@nexus_reviews_cache',
  ONBOARDING_SEEN: '@nexus_onboarding_seen',
  AUTH_STATE: '@nexus_auth_state',
  DAILY_PROGRESS: '@nexus_daily_progress',
  REVIEWED_SESSIONS: '@nexus_reviewed_sessions',
  ACTIVE_DATES: '@nexus_active_dates',
};

/**
 * Local record of whether the user is signed in.
 *
 * When Supabase is configured its own persisted session is authoritative; this
 * flag is what carries sign-in state in offline/mock mode, and it is what lets
 * the launch sequence pick an entry route before any network call resolves.
 */
export type PersistedAuthState = 'authenticated' | 'guest';

export async function saveAuthState(state: PersistedAuthState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.AUTH_STATE, state);
  } catch (err) {
    console.warn('Error saving auth state:', err);
  }
}

export async function loadAuthState(): Promise<PersistedAuthState | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.AUTH_STATE);
    return val === 'authenticated' || val === 'guest' ? val : null;
  } catch (err) {
    console.warn('Error loading auth state:', err);
    return null;
  }
}

export async function saveOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_SEEN, 'true');
  } catch (err) {
    console.warn('Error saving onboarding flag:', err);
  }
}

export async function loadOnboardingSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.ONBOARDING_SEEN)) === 'true';
  } catch (err) {
    console.warn('Error loading onboarding flag:', err);
    return false;
  }
}

/** Clears per-user state on sign out. Onboarding and theme are device-level, so they stay. */
export async function clearSessionStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.AUTH_STATE, KEYS.PROFILE]);
  } catch (err) {
    console.warn('Error clearing session storage:', err);
  }
}

export async function saveThemeStorage(theme: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.THEME, theme);
  } catch (err) {
    console.warn('Error saving theme:', err);
  }
}

export async function loadThemeStorage(): Promise<ThemeMode | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.THEME);
    if (val === 'light' || val === 'dark' || val === 'midnight') {
      return val;
    }
    return null;
  } catch (err) {
    console.warn('Error loading theme:', err);
    return null;
  }
}

export async function saveProfileStorage(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.warn('Error saving profile:', err);
  }
}

export async function loadProfileStorage(): Promise<UserProfile | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.PROFILE);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.warn('Error loading profile:', err);
    return null;
  }
}

export async function saveNotificationPrefsStorage(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(prefs));
  } catch (err) {
    console.warn('Error saving notifications:', err);
  }
}

export async function loadNotificationPrefsStorage(): Promise<NotificationPrefs | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.warn('Error loading notifications:', err);
    return null;
  }
}

export async function saveCommunitiesCache(communities: CommunityItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.COMMUNITIES, JSON.stringify(communities));
  } catch (err) {
    console.warn('Error caching communities:', err);
  }
}

export async function loadCommunitiesCache(): Promise<CommunityItem[] | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.COMMUNITIES);
    if (!val) return null;
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (c: any) => c && c.id !== 'calc' && c.id !== 'quantum' && c.id !== 'algo' && c.id !== 'c1' && c.id !== 'c2' && c.id !== 'c3'
    );
  } catch (err) {
    console.warn('Error loading communities cache:', err);
    return null;
  }
}

export async function saveMeetupsCache(meetups: InPersonMeetup[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.MEETUPS, JSON.stringify(meetups));
  } catch (err) {
    console.warn('Error caching meetups:', err);
  }
}

export async function loadMeetupsCache(): Promise<InPersonMeetup[] | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.MEETUPS);
    if (!val) return null;
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (m: any) => m && m.id !== 'm1' && m.id !== 'm2' && m.id !== 'm3'
    );
  } catch (err) {
    console.warn('Error loading meetups cache:', err);
    return null;
  }
}

export async function saveSessionsCache(sessions: SessionItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Error caching sessions:', err);
  }
}

export async function loadSessionsCache(): Promise<SessionItem[] | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.SESSIONS);
    if (!val) return null;
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (s: any) => s && s.id !== 'calc-101' && s.id !== 'algo-201' && s.id !== 'cs-101' && s.id !== 'physics-101'
    );
  } catch (err) {
    console.warn('Error loading sessions cache:', err);
    return null;
  }
}



export async function saveReviewsCache(reviews: Review[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));
  } catch (err) {
    console.warn('Error caching reviews:', err);
  }
}

export async function loadReviewsCache(): Promise<Review[] | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.REVIEWS);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.warn('Error loading reviews cache:', err);
    return null;
  }
}

/**
 * Today's daily-goal progress (the Home screen's auto-tracked checklist and
 * "Log Study Time" XP button). Scoped to a calendar date so goals genuinely
 * reset once a day, instead of on every app relaunch — without this, force-
 * quitting and reopening the app cleared `activityLog` back to all-false and
 * let the same daily goal XP be re-earned for free every time.
 */
export type DailyProgress = {
  date: string;
  activityLog: ActivityLog;
  loggedHours: number;
};

export async function saveDailyProgressStorage(progress: DailyProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DAILY_PROGRESS, JSON.stringify(progress));
  } catch (err) {
    console.warn('Error saving daily progress:', err);
  }
}

export async function loadDailyProgressStorage(): Promise<DailyProgress | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.DAILY_PROGRESS);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.warn('Error loading daily progress:', err);
    return null;
  }
}



/**
 * Ids of live sessions the user has already rated. Without this, leaving and
 * rejoining the same session let the tutor be reviewed (and the +15 XP)
 * again and again.
 */
export async function saveReviewedSessionsStorage(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.REVIEWED_SESSIONS, JSON.stringify(ids));
  } catch (err) {
    console.warn('Error saving reviewed sessions:', err);
  }
}

export async function loadReviewedSessionsStorage(): Promise<string[] | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.REVIEWED_SESSIONS);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.warn('Error loading reviewed sessions:', err);
    return null;
  }
}

/**
 * Persists recent calendar dates ('YYYY-MM-DD') on which the user completed
 * study activities or attended live sessions.
 */
export async function saveActiveDatesStorage(dates: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ACTIVE_DATES, JSON.stringify(dates));
  } catch (err) {
    console.warn('Error saving active dates:', err);
  }
}

export async function loadActiveDatesStorage(): Promise<string[] | null> {
  try {
    const val = await AsyncStorage.getItem(KEYS.ACTIVE_DATES);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.warn('Error loading active dates:', err);
    return null;
  }
}

