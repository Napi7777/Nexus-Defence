import { createContext, useContext } from 'react';

/** Keys that map 1-to-1 with auto-completable daily study goals. */
export type ActivityKey = 'attendedSession' | 'participatedCommunity';

/** Tracks which goal-triggering actions the user has completed today. */
export type ActivityLog = Record<ActivityKey, boolean>;

export const DEFAULT_ACTIVITY_LOG: ActivityLog = {
  attendedSession: false,
  participatedCommunity: false,
};
import {
  CommunityItem,
  InPersonMeetup,
  NotificationPrefs,
  Review,
  SessionItem,
  ThreadPreview,
  UserProfile,
  filterSections,
} from '@/data/mockData';

export type AppRoute =
  | 'splash'
  | 'onboarding'
  | 'welcome'
  | 'signup'
  | 'signin'
  | 'main-home'
  | 'main-communities'
  | 'main-sessions'
  | 'main-chat'
  | 'main-profile'
  | 'community-details'
  | 'create-community'
  | 'schedule-session'
  | 'create-meetup'
  | 'leaderboard'
  | 'filters'
  | 'private-chat'
  | 'session-lobby'
  | 'edit-profile'
  | 'change-password'
  | 'notification-preferences'
  | 'settings'
  | 'moderation'
  | 'community-members';

export type TabKey = 'home' | 'communities' | 'sessions' | 'chat' | 'profile';
export type FilterKey = keyof typeof filterSections;
export type FilterState = Record<FilterKey, string[]>;
export type ThemeMode = 'system' | 'light' | 'dark' | 'midnight';

export type AppStore = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  notificationPrefs: NotificationPrefs;
  toggleNotification: (key: keyof NotificationPrefs) => void;
  threads: ThreadPreview[];
  messagesByThread: Record<string, { id: string; sender: 'me' | 'them'; text: string; time: string }[]>;
  sendMessage: (threadId: string, text: string) => void;
  selectedFilters: FilterState;
  toggleFilter: (section: FilterKey, value: string) => void;
  resetFilters: () => void;
  communitiesList: CommunityItem[];
  toggleJoinCommunity: (communityId: string) => void;
  addCommunity: (name: string, subject: string, description: string) => void;
  sessionsList: SessionItem[];
  /** `time` is the display string ("Fri, Sep 12 · 3:00 PM"); `scheduledAtIso`
   * is the real timestamp picked in the Date & Time field, persisted as
   * `sessions.scheduled_at` (SRS 3.5) instead of the moment the tutor happened
   * to tap "Schedule". */
  addSession: (title: string, tag: string, time: string, scheduledAtIso: string) => void;
  meetupsList: InPersonMeetup[];
  toggleRSVPMeetup: (meetupId: string) => void;
  /** `extra` carries venue details (coordinates, directions…) resolved from the picked campus venue.
   * `scheduledAtIso` is the real timestamp picked in the Date & Time field (SRS 3.6). */
  addMeetup: (
    title: string,
    location: string,
    dateTime: string,
    scheduledAtIso: string,
    extra?: Partial<InPersonMeetup>
  ) => void;
  /** Reviews students have left for tutors — never for the reviewer themselves. */
  reviewsList: Review[];
  /** Ids of live sessions the user has already submitted a tutor rating for. */
  reviewedSessionIds: string[];
  /** No-ops (and awards nothing) if `sessionId` has already been reviewed.
   * `tutorId` is the tutor's real profile id — when present, the rating is
   * written to the server-side `ratings` ledger (SRS 3.10) instead of only
   * ever existing as a local, client-trusted number. */
  addReview: (review: {
    sessionId: string;
    tutorId?: string;
    tutorName: string;
    rating: number;
    comment: string;
  }) => void;
  /** Tracks which goal-triggering actions have been completed today. Resets
   * once the calendar date rolls over, not on every app relaunch. */
  activityLog: ActivityLog;
  /** Call this when the user completes a goal-triggering action. Awards the
   * goal's XP exactly once — the very first time the flag flips true. */
  recordActivity: (key: ActivityKey) => void;
  /** Hours logged today toward the "Log Study Time" XP button, capped at 6.0. */
  loggedHours: number;
  /** Adds 30 minutes and +15 XP, but only while under today's 6-hour cap —
   * once reached, further taps do nothing (no more free XP for the day). */
  logStudyTime: () => void;
  /** Records real-time minutes spent in study sessions or activities toward today's study progress. */
  logStudyMinutes: (minutes: number) => void;
  /** True until the first remote fetch settles — drives skeleton placeholders. */
  isLoadingData: boolean;
  /** True while a pull-to-refresh is in flight. */
  isRefreshing: boolean;
  /** Re-fetches communities, sessions and meetups. Wired to RefreshControl. */
  refreshAll: () => Promise<void>;

  /* ------------------------------- Session ------------------------------- */
  /** True while the launch sequence restores the persisted session. */
  isBootstrapping: boolean;
  /** True when a Supabase session (or an offline sign-in) is active. */
  isAuthenticated: boolean;
  /** Records a successful sign-in / sign-up and persists it across relaunches. */
  markAuthenticated: () => void;
  /** Ends the session, clears cached user state, and returns to the welcome screen. */
  signOut: () => Promise<void>;
  /** True once the user has completed or skipped onboarding on this device. */
  hasSeenOnboarding: boolean;
  /** Records that onboarding has been seen so it never replays. */
  markOnboardingSeen: () => void;
};

export const AppStoreContext = createContext<AppStore | null>(null);

export const useAppStore = (): AppStore => {
  const value = useContext(AppStoreContext);
  if (!value) {
    throw new Error('AppStoreContext is not available');
  }
  return value;
};
