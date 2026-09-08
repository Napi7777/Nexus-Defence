import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MainShell } from '@/navigation';
import { ScreenTransitionContainer } from '@/navigation/ScreenTransitionContainer';
import { useNavigationStack } from '@/navigation/useNavigationStack';
import { AppRoute, AppStore, AppStoreContext, FilterState, ThemeMode, ActivityLog, DEFAULT_ACTIVITY_LOG } from '@/context/AppStoreContext';
import {
  communities as initialCommunities,
  currentUser,
  DEFAULT_AVATAR,
  defaultNotificationPrefs,
  sampleMeetups,
  threadMessages,
  threadPreviews,
  upcomingSessions as initialUpcomingSessions,
  CommunityItem,
  InPersonMeetup,
  Review,
  SessionItem,
} from '@/data/mockData';
import { CommunitiesScreen, CommunityDetailScreen, CreateCommunityScreen } from '@/screens/communities';
import { HomeScreen } from '@/screens/home';
import {
  ProfileScreen,
  EditProfileScreen,
  ChangePasswordScreen,
  NotificationPreferencesScreen,
  SettingsScreen,
} from '@/screens/profile';
import { ChatListScreen, PrivateChatScreen } from '@/screens/chat';
import { SessionsScreen, ScheduleSessionScreen, SessionLobbyScreen, CreateMeetupScreen } from '@/screens/sessions';
import { FiltersScreen } from '@/screens/filters';
import { LeaderboardScreen } from '@/screens/leaderboard';
import { CommunityMembersScreen, ModerationScreen } from '@/screens/moderation';
import { OnboardingScreen, SignupScreen, SigninScreen, SplashScreen, WelcomeScreen } from '@/screens/auth';
import { applyThemeStyles, getThemeColors, nowTime, styles } from '@/styles/appStyles';

import { resolveAuthenticated, resolveEntryRoute } from '@/lib/session';
import { GlobalSearchModal, NotificationCenterModal } from '@/components/overlays';
import { ErrorBoundary, ToastProvider } from '@/components/feedback';
import {
  clearSessionStorage,
  loadActiveDatesStorage,
  loadAuthState,
  loadCommunitiesCache,
  loadDailyProgressStorage,
  loadMeetupsCache,
  loadNotificationPrefsStorage,
  loadOnboardingSeen,
  loadProfileStorage,
  loadReviewedSessionsStorage,
  loadReviewsCache,
  loadSessionsCache,
  loadThemeStorage,
  saveActiveDatesStorage,
  saveAuthState,
  saveOnboardingSeen,
  saveCommunitiesCache,
  saveDailyProgressStorage,
  saveMeetupsCache,
  saveNotificationPrefsStorage,
  saveProfileStorage,
  saveReviewedSessionsStorage,
  saveReviewsCache,
  saveSessionsCache,
  saveThemeStorage,
} from '@/lib/storage';

/** Calendar-day key (device-local) that daily-goal progress is scoped to. */
function todayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden, or unavailable in this runtime */
});

// No filters selected by default. These used to be pre-populated, which was
// harmless while the filters were inert — now that subject actually filters the
// sessions list, a seeded value would silently hide sessions on first launch
// before the user has opened the filters screen.
const initialFilters: FilterState = {
  subject: [],
  contentType: [],
  skillLevel: [],
  availability: [],
  minimumRating: [],
};

export default function App() {
  const systemColorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Ask for camera and microphone access up front, on first launch, rather
  // than waiting until the user is already mid-way into joining a live
  // session (SessionLobbyScreen only prompts lazily for camera, and never for
  // the microphone at all). A denial here is non-fatal — screens that need
  // the permission still re-request it themselves before using the camera.
  const [, requestCameraPermission] = useCameraPermissions();
  const [, requestMicrophonePermission] = useMicrophonePermissions();
  useEffect(() => {
    requestCameraPermission().catch((err) => console.warn('Camera permission request error:', err));
    requestMicrophonePermission().catch((err) => console.warn('Microphone permission request error:', err));
    // Intentionally once, on first launch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { currentRoute, push, replace, goBack, reset, openTab } =
    useNavigationStack('splash');
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // The bell icon's badge must show nothing until there's a real unread
  // notification — it used to be a hardcoded "3" on HomeScreen regardless of
  // whether anything was actually unread.
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [profile, setProfile] = useState(currentUser);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs);
  const [threads, setThreads] = useState(threadPreviews);
  const [messagesByThread, setMessagesByThread] = useState(threadMessages);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState(initialFilters);
  const [communitiesList, setCommunitiesList] = useState(initialCommunities);
  const [sessionsList, setSessionsList] = useState(initialUpcomingSessions);
  const [meetupsList, setMeetupsList] = useState(sampleMeetups);
  // Reviews only ever come from real students rating a real tutoring session
  // (see SessionLobbyScreen's rate-tutor flow) — never seeded, so the Profile
  // screen genuinely starts with zero reviews until one is earned.
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog>(DEFAULT_ACTIVITY_LOG);
  // "Log Study Time" is capped at 6 hours/day — the cap used to only limit the
  // displayed hours, not the +15 XP the button paid out on every tap, so it
  // could be clicked forever for free points. 2.5 is just today's starting
  // display value; only taps past it can ever add XP.
  const [loggedHours, setLoggedHours] = useState(0);
  // Ids of live sessions already rated — persisted so leaving and coming
  // back (or relaunching the app) can't re-earn points for the same session.
  const [reviewedSessionIds, setReviewedSessionIds] = useState<string[]>([]);

  const themeColors = useMemo(
    () => getThemeColors(theme, systemColorScheme),
    [theme, systemColorScheme]
  );

  // Rebuild the shared stylesheet for this theme before any child renders.
  useMemo(() => applyThemeStyles(themeColors), [themeColors]);

  const currentThreadId = activeThreadId || (threads[0]?.id ?? 'default');
  const activeCommunity =
    communitiesList.find((c) => c.id === activeCommunityId) || communitiesList[0];

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* --------------------------- Session lifecycle ---------------------------
   * The app used to open on 'splash' -> 'onboarding' unconditionally, so every
   * relaunch replayed onboarding even for a signed-in user. Launch now resolves
   * the persisted session first and picks an entry route from it. */
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [entryRoute, setEntryRoute] = useState<AppRoute | null>(null);
  // Splash stays up until BOTH its own minimum display time and bootstrap finish.
  const [showSplash, setShowSplash] = useState(true);

  const markAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
    saveAuthState('authenticated');
  }, []);

  const markOnboardingSeen = useCallback(() => {
    setHasSeenOnboarding(true);
    saveOnboardingSeen();
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { signOutUser } = await import('@/lib/supabase');
      await signOutUser();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    await clearSessionStorage();
    setIsAuthenticated(false);
    setProfile(currentUser);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      const [seenOnboarding, persistedAuth] = await Promise.all([
        loadOnboardingSeen(),
        loadAuthState(),
      ]);

      let hasSupabaseEnv = false;
      let hasSupabaseSession = false;

      try {
        const supabaseLib = await import('@/lib/supabase');
        hasSupabaseEnv = supabaseLib.hasSupabaseEnv;
        if (hasSupabaseEnv) {
          // getSession() normally reads the AsyncStorage-persisted session, but
          // it can attempt a token refresh over the network. Cap it so a bad
          // connection cannot hold the splash open past its own duration.
          const session = await Promise.race([
            supabaseLib.getCurrentSession(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
          hasSupabaseSession = Boolean(session?.user);
        }
      } catch (err) {
        console.warn('Session restore error:', err);
      }

      const authed = resolveAuthenticated({ hasSupabaseEnv, hasSupabaseSession, persistedAuth });
      if (hasSupabaseEnv) {
        await saveAuthState(authed ? 'authenticated' : 'guest');
      }

      if (cancelled) return;
      setHasSeenOnboarding(seenOnboarding);
      setIsAuthenticated(authed);
      setEntryRoute(resolveEntryRoute({ isAuthenticated: authed, hasSeenOnboarding: seenOnboarding }));
      setIsBootstrapping(false);
    }

    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Shared by the initial mount fetch and pull-to-refresh.
  const refreshCollections = useCallback(async () => {
    try {
      const {
        getCommunities,
        getSessions,
        getMeetups,
        getCurrentSession,
        fetchUserProfile,
        getMyProgress,
      } = await import('@/lib/supabase');

      const [liveCommunities, liveSessions, liveMeetups, session] = await Promise.all([
        getCommunities(),
        getSessions(),
        getMeetups(),
        getCurrentSession(),
      ]);

      setCommunitiesList(liveCommunities ?? []);
      await saveCommunitiesCache(liveCommunities ?? []);

      setSessionsList(liveSessions ?? []);
      await saveSessionsCache(liveSessions ?? []);

      setMeetupsList(liveMeetups ?? []);
      await saveMeetupsCache(liveMeetups ?? []);

      if (session?.user) {
        const [liveProfile, progressSummary] = await Promise.all([
          fetchUserProfile(session.user.id),
          getMyProgress(),
        ]);
        if (liveProfile) {
          setProfile((prev) => {
            const highestPoints = Math.max(
              prev.points || 0,
              liveProfile.points || 0,
              progressSummary?.pointsEarned || 0,
            );
            const merged = {
              ...prev,
              ...liveProfile,
              points: highestPoints,
              sessions: Math.max(
                prev.sessions || 0,
                progressSummary?.sessionsAttended || 0,
                liveProfile.sessions || 0,
              ),
            };
            saveProfileStorage(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Collection refresh error:', err);
    }
  }, []);

  useEffect(() => {
    async function hydrateLocalStorage() {
      try {
        const cachedTheme = await loadThemeStorage();
        if (cachedTheme) setTheme(cachedTheme);

        const cachedProfile = await loadProfileStorage();
        if (cachedProfile) setProfile(cachedProfile);

        const cachedPrefs = await loadNotificationPrefsStorage();
        if (cachedPrefs) setNotificationPrefs(cachedPrefs);

        const cachedComms = await loadCommunitiesCache();
        if (cachedComms && cachedComms.length > 0) setCommunitiesList(cachedComms);

        const cachedMeetups = await loadMeetupsCache();
        if (cachedMeetups && cachedMeetups.length > 0) setMeetupsList(cachedMeetups);

        const cachedSessions = await loadSessionsCache();
        if (cachedSessions && cachedSessions.length > 0) setSessionsList(cachedSessions);

        const cachedReviews = await loadReviewsCache();
        if (cachedReviews && cachedReviews.length > 0) setReviewsList(cachedReviews);

        // Daily goals + logged study hours only carry over from today. A
        // stored date other than today means a new day has started, so the
        // in-memory defaults (all goals incomplete, 2.5 logged hours) stand —
        // that is the "reset", not clearing AsyncStorage.
        const cachedDailyProgress = await loadDailyProgressStorage();
        if (cachedDailyProgress && cachedDailyProgress.date === todayKey()) {
          setActivityLog(cachedDailyProgress.activityLog);
          setLoggedHours(cachedDailyProgress.loggedHours);
        }

        const cachedReviewedSessions = await loadReviewedSessionsStorage();
        if (cachedReviewedSessions) setReviewedSessionIds(cachedReviewedSessions);
      } catch (err) {
        console.warn('Local storage hydration error:', err);
      }
    }

    hydrateLocalStorage();

    async function initSupabaseData() {
      try {
        const {
          supabase,
          getUserJoinedCommunities,
          getUserMeetupRSVPs,
          getCurrentSession,
          fetchUserProfile,
          checkAccountBanned,
        } = await import('@/lib/supabase');

        if (!supabase) return;

        // Fetch initial Supabase auth user profile
        const session = await getCurrentSession();
        if (session?.user) {
          // A suspended account (SRS 3.12) can no longer write anything under
          // RLS regardless, but it should not keep sitting inside the
          // signed-in app either — check on every launch and every auth
          // change (below), not just at the moment an admin flips the flag.
          if (await checkAccountBanned(session.user.id)) {
            await signOut();
            reset('welcome');
            return;
          }

          const liveProfile = await fetchUserProfile(session.user.id);
          if (liveProfile) {
            setProfile(liveProfile);
            saveProfileStorage(liveProfile);
          } else {
            const userEmail = session.user.email || '';
            const userName = session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'User';
            setProfile((prev) => ({
              ...prev,
              name: userName,
              email: userEmail,
              avatar: session.user.user_metadata?.avatar_url || DEFAULT_AVATAR,
            }));
          }

          // Hydrate user community memberships
          const joinedIds = await getUserJoinedCommunities(session.user.id);
          if (joinedIds && joinedIds.length > 0) {
            setCommunitiesList((prev) =>
              prev.map((c) => ({ ...c, joined: joinedIds.includes(c.id) }))
            );
          }

          // Hydrate user meetup RSVPs
          const rsvpIds = await getUserMeetupRSVPs(session.user.id);
          if (rsvpIds && rsvpIds.length > 0) {
            setMeetupsList((prev) =>
              prev.map((m) => ({ ...m, rsvpStatus: rsvpIds.includes(m.id) }))
            );
          }
        }

        // Listen for live Auth State changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
          if (session?.user) {
            if (await checkAccountBanned(session.user.id)) {
              await signOut();
              reset('welcome');
              return;
            }
            const liveProfile = await fetchUserProfile(session.user.id);
            if (liveProfile) {
              setProfile(liveProfile);
              saveProfileStorage(liveProfile);
            }
          }
        });

        // Register Expo Push Token for mobile notifications
        try {
          const { registerForPushNotificationsAsync } = await import('./src/lib/notifications');
          const token = await registerForPushNotificationsAsync();
          if (token) {
            console.log('Push token active:', token);
          }
        } catch (err) {
          console.warn('Push notification initialization error:', err);
        }

        await refreshCollections();

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err) {
        console.warn('Live backend connection error:', err);
      }
    }

    initSupabaseData().finally(() => setIsLoadingData(false));
  }, [refreshCollections]);

  // Navigate underneath the splash as soon as the launch route is known, so
  // the screen is fully mounted and painted before the overlay dissolves.
  useEffect(() => {
    if (entryRoute && currentRoute === 'splash') {
      reset(entryRoute);
    }
  }, [currentRoute, entryRoute, reset]);

  // SRS 3.2: "Sessions must expire after inactivity." Instrumenting every
  // screen with touch listeners just to measure foreground idle time would
  // be invasive for very little gain, so this uses the same signal most
  // mobile banking/health apps rely on instead: how long the app sat
  // backgrounded. Coming back to the foreground after sitting backgrounded
  // for longer than IDLE_TIMEOUT_MS signs the session out instead of
  // resuming straight back into whatever screen was open.
  useEffect(() => {
    if (!isAuthenticated) return;

    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let backgroundedAt: number | null = null;

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'background' || status === 'inactive') {
        backgroundedAt = backgroundedAt ?? Date.now();
      } else if (status === 'active' && backgroundedAt) {
        const idleMs = Date.now() - backgroundedAt;
        backgroundedAt = null;
        if (idleMs >= IDLE_TIMEOUT_MS) {
          signOut().then(() => reset('welcome'));
        }
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, signOut, reset]);

  // Real, live unread-notification count for the bell badge (SRS 3.8 — "must
  // be real-time"). Fetched whenever the signed-in user changes, bumped
  // instantly when a new row lands via realtime, and re-synced whenever the
  // notification center closes (the user may have read some while it was
  // open — that state lives inside the modal, not here, so re-fetch rather
  // than trying to mirror it).
  const refreshUnreadCount = useCallback(async () => {
    if (!profile.id) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const { getUnreadNotificationCount } = await import('@/lib/supabase');
      const count = await getUnreadNotificationCount(profile.id);
      setUnreadNotificationCount(count);
    } catch (err) {
      console.warn('Unread notification count error:', err);
    }
  }, [profile.id]);

  useEffect(() => {
    if (!profile.id) {
      setUnreadNotificationCount(0);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    refreshUnreadCount();

    import('@/lib/supabase').then(({ subscribeToNotifications }) => {
      unsubscribe = subscribeToNotifications(profile.id!, () => {
        setUnreadNotificationCount((prev) => prev + 1);
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [profile.id, refreshUnreadCount]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCollections();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCollections]);

  const handleSetTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    saveThemeStorage(newTheme);
  };

  const markTodayStudyActive = () => {
    const today = todayKey();
    loadActiveDatesStorage().then((dates) => {
      const current = dates || [];
      if (!current.includes(today)) {
        saveActiveDatesStorage([today, ...current]);
      }
    });
  };

  /**
   * Awards a daily goal's XP the first time (and only the first time) its
   * flag flips true. Used to live as a `useEffect` inside HomeScreen, guarded
   * by a `useRef` — but the Home tab remounts every time the user navigates
   * away and back (each tab is a fresh element in the route switch below), so
   * the ref reset on every remount and re-awarded the XP on every revisit.
   * Living here instead, the guard is a real state value that survives
   * navigation, so each goal can only ever pay out once per day.
   */
  const recordActivity = (key: keyof ActivityLog) => {
    if (activityLog[key]) return;
    const points = key === 'attendedSession' ? 50 : key === 'participatedCommunity' ? 25 : 0;
    const nextLog = { ...activityLog, [key]: true };
    setActivityLog(nextLog);
    markTodayStudyActive();
    if (points > 0) {
      setProfile((prev) => {
        const nextPoints = (prev.points || 0) + points;
        const updated = { ...prev, points: nextPoints };
        saveProfileStorage(updated);
        import('@/lib/supabase').then(({ getCurrentSession, awardPoints, updateUserProfile }) => {
          awardPoints(key === 'attendedSession' ? 'session_attended' : 'daily_task').catch(() => {});
          getCurrentSession().then((session) => {
            if (session?.user) {
              updateUserProfile(session.user.id, { points: nextPoints }).catch(() => {});
            }
          });
        });
        return updated;
      });
    }
    saveDailyProgressStorage({ date: todayKey(), activityLog: nextLog, loggedHours });
  };

  /** +15 XP per 30 minutes logged, capped at 6 hours/day — once the cap is
   * hit, further taps do nothing at all (no hours, no points). */
  const logStudyTime = () => {
    if (loggedHours >= 6.0) return;
    const nextHours = Math.min(6.0, loggedHours + 0.5);
    setLoggedHours(nextHours);
    markTodayStudyActive();
    setProfile((prev) => {
      const nextPoints = (prev.points || 0) + 15;
      const updated = { ...prev, points: nextPoints };
      saveProfileStorage(updated);
      import('@/lib/supabase').then(({ getCurrentSession, awardPoints, updateUserProfile }) => {
        awardPoints('daily_task').catch(() => {});
        getCurrentSession().then((session) => {
          if (session?.user) {
            updateUserProfile(session.user.id, { points: nextPoints }).catch(() => {});
          }
        });
      });
      return updated;
    });
    saveDailyProgressStorage({ date: todayKey(), activityLog, loggedHours: nextHours });
  };

  /** Records real-time minutes spent in study sessions or activities toward today's study progress. */
  const logStudyMinutes = useCallback(
    (minutes: number) => {
      if (minutes <= 0) return;
      const additionalHours = minutes / 60;
      setLoggedHours((prev) => {
        const nextHours = Math.min(6.0, parseFloat((prev + additionalHours).toFixed(2)));
        saveDailyProgressStorage({ date: todayKey(), activityLog, loggedHours: nextHours });
        return nextHours;
      });
      markTodayStudyActive();
    },
    [activityLog],
  );

  const store = useMemo<AppStore>(
    () => ({
      theme,
      setTheme: handleSetTheme,
      profile,
      updateProfile: (patch) => {
        setProfile((prev) => {
          const updated = { ...prev, ...patch };
          saveProfileStorage(updated);
          import('@/lib/supabase').then(({ getCurrentSession, updateUserProfile }) => {
            getCurrentSession().then((session) => {
              if (session?.user) {
                updateUserProfile(session.user.id, {
                  full_name: updated.name,
                  university: updated.university,
                  major: updated.major,
                  year: updated.year,
                  bio: updated.bio,
                  avatar_url: updated.avatar,
                  skills: updated.skills,
                  // Interests, skill level and availability all drive the
                  // recommendation engine and tutor search filters (SRS
                  // 3.1/3.4/3.11) — they used to be edited locally and never
                  // synced, so every other user's search/recommendations saw
                  // stale or empty values for anyone who edited their profile.
                  interests: updated.interests,
                  skill_level: updated.skillLevel,
                  availability: updated.availability,
                  points: updated.points,
                  streak: updated.streak,
                });
              }
            });
          });
          return updated;
        });
      },
      notificationPrefs,
      toggleNotification: (key) =>
        setNotificationPrefs((prev) => {
          const updated = { ...prev, [key]: !prev[key] };
          saveNotificationPrefsStorage(updated);
          return updated;
        }),
      threads,
      messagesByThread,
      sendMessage: (threadId, text) => {
        if (!text.trim()) return;
        const newMessage = {
          id: `${threadId}-${Date.now()}`,
          sender: 'me' as const,
          text: text.trim(),
          time: nowTime(),
        };

        setMessagesByThread((prev) => ({
          ...prev,
          [threadId]: [...(prev[threadId] ?? prev.default), newMessage],
        }));

        setThreads((prev) => {
          const next = prev.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  preview: text.trim(),
                  time: nowTime(),
                }
              : thread,
          );
          return next;
        });
      },
      selectedFilters,
      toggleFilter: (section, value) => {
        setSelectedFilters((prev) => {
          const current = prev[section];
          const exists = current.includes(value);
          const next = exists ? current.filter((item) => item !== value) : [...current, value];
          return { ...prev, [section]: next };
        });
      },
      resetFilters: () => setSelectedFilters(initialFilters),
      communitiesList,
      toggleJoinCommunity: (communityId) => {
        setCommunitiesList((prev) =>
          prev.map((item) => {
            if (item.id === communityId) {
              const nextJoined = !item.joined;
              import('@/lib/supabase')
                .then(({ getCurrentSession, joinCommunity, leaveCommunity }) => {
                  getCurrentSession()
                    .then((session) => {
                      if (session?.user) {
                        if (nextJoined) {
                          joinCommunity(communityId, session.user.id);
                        } else {
                          leaveCommunity(communityId, session.user.id);
                        }
                      }
                    })
                    .catch((err) => console.warn('Community sync warning:', err));
                })
                .catch((err) => console.warn('Supabase import warning:', err));
              return {
                ...item,
                joined: nextJoined,
                members: nextJoined ? item.members + 1 : Math.max(item.members - 1, 0),
              };
            }
            return item;
          }),
        );
      },
      addCommunity: (name, subject, description) => {
        const newCommunity: CommunityItem = {
          id: `community-${Date.now()}`,
          name,
          subject,
          members: 1,
          posts: 0,
          description,
          image:
            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
          joined: true,
          postsFeed: [],
        };
        setCommunitiesList((prev) => {
          const updated = [newCommunity, ...prev];
          saveCommunitiesCache(updated);
          return updated;
        });
        const newPoints = (profile.points || 0) + 100;
        setProfile((prevProf) => {
          const updated = {
            ...prevProf,
            points: (prevProf.points || 0) + 100,
            communities: (prevProf.communities || 0) + 1,
          };
          saveProfileStorage(updated);
          return updated;
        });
        import('@/lib/supabase')
          .then(({ getCurrentSession, createCommunityInSupabase, awardPoints, updateUserProfile }) => {
            getCurrentSession()
              .then((session) => {
                if (session?.user) {
                  createCommunityInSupabase(name, subject, description, session.user.id);
                  awardPoints('community_created').catch(() => {});
                  updateUserProfile(session.user.id, { points: newPoints }).catch(() => {});
                }
              })
              .catch((err) => console.warn('Create community sync warning:', err));
          })
          .catch((err) => console.warn('Supabase import warning:', err));
      },
      sessionsList,
      addSession: (title, tag, time, scheduledAtIso) => {
        const newSession: SessionItem = {
          id: `session-${Date.now()}`,
          title,
          tutor: profile.name,
          time,
          participants: '1/20',
          tag,
          image: profile.avatar,
        };
        setSessionsList((prev) => {
          const updated = [newSession, ...prev];
          saveSessionsCache(updated);
          return updated;
        });
        import('@/lib/supabase')
          .then(({ getCurrentSession, createSession }) => {
            getCurrentSession()
              .then((session) => {
                if (session?.user) {
                  createSession({
                    title,
                    tutor_id: session.user.id,
                    tag,
                    // The tutor's actual chosen date & time (SRS 3.5) — this used
                    // to always be "now", so every session synced to the
                    // backend as already starting the instant it was created.
                    scheduled_at: scheduledAtIso || new Date().toISOString(),
                    duration_minutes: 60,
                    max_participants: 20,
                  });
                }
              })
              .catch((err) => console.warn('Create session sync warning:', err));
          })
          .catch((err) => console.warn('Supabase import warning:', err));
      },
      isLoadingData,
      isRefreshing,
      refreshAll,
      isBootstrapping,
      isAuthenticated,
      markAuthenticated,
      signOut,
      hasSeenOnboarding,
      markOnboardingSeen,
      activityLog,
      recordActivity,
      loggedHours,
      logStudyTime,
      logStudyMinutes,
      meetupsList,
      toggleRSVPMeetup: (meetupId) => {
        setMeetupsList((prev) =>
          prev.map((m) => {
            if (m.id === meetupId) {
              const nextRSVP = !m.rsvpStatus;
              if (nextRSVP) {
                const newPoints = (profile.points || 0) + 35;
                setProfile((prevProf) => {
                  const updated = { ...prevProf, points: (prevProf.points || 0) + 35 };
                  saveProfileStorage(updated);
                  return updated;
                });
                import('@/lib/supabase').then(({ getCurrentSession, awardPoints, updateUserProfile }) => {
                  awardPoints('meetup_attended', meetupId).catch(() => {});
                  getCurrentSession().then((session) => {
                    if (session?.user) {
                      updateUserProfile(session.user.id, { points: newPoints }).catch(() => {});
                    }
                  });
                });
              }
              import('@/lib/supabase')
                .then(({ getCurrentSession, rsvpMeetupInSupabase }) => {
                  getCurrentSession()
                    .then((session) => {
                      if (session?.user) {
                        rsvpMeetupInSupabase(meetupId, session.user.id, nextRSVP);
                      }
                    })
                    .catch((err) => console.warn('RSVP sync warning:', err));
                })
                .catch((err) => console.warn('Supabase import warning:', err));
              return {
                ...m,
                rsvpStatus: nextRSVP,
                rsvpCount: nextRSVP ? m.rsvpCount + 1 : Math.max(m.rsvpCount - 1, 0),
              };
            }
            return m;
          }),
        );
      },
      addMeetup: (title, location, dateTime, scheduledAtIso, extra) => {
        const newMeetup: InPersonMeetup = {
          id: `meetup-${Date.now()}`,
          title,
          location,
          dateTime,
          organizer: profile.name,
          rsvpCount: 1,
          rsvpStatus: true,
          ...extra,
        };
        setMeetupsList((prev) => [newMeetup, ...prev]);
        import('@/lib/supabase')
          .then(({ getCurrentSession, createMeetupInSupabase }) => {
            getCurrentSession()
              .then((session) => {
                // The organizer's actual chosen date & time (SRS 3.6) — this
                // used to always be "now" regardless of what was picked.
                createMeetupInSupabase(title, location, scheduledAtIso || new Date().toISOString(), session?.user?.id);
              })
              .catch((err) => console.warn('Create meetup sync warning:', err));
          })
          .catch((err) => console.warn('Supabase import warning:', err));
      },
      reviewsList,
      reviewedSessionIds,
      addReview: (review) => {
        // A session can only be rated once — without this, leaving and
        // rejoining the same live session let the tutor be reviewed (and the
        // XP) again on every rejoin.
        if (review.sessionId && reviewedSessionIds.includes(review.sessionId)) return;

        const newReview: Review = {
          id: `review-${Date.now()}`,
          author: profile.name,
          tutorName: review.tutorName,
          rating: review.rating,
          comment: review.comment.trim() || 'Great session!',
          date: 'Just now',
        };
        setReviewsList((prev) => {
          const updated = [newReview, ...prev];
          saveReviewsCache(updated);
          return updated;
        });

        if (review.sessionId) {
          const nextReviewed = [...reviewedSessionIds, review.sessionId];
          setReviewedSessionIds(nextReviewed);
          saveReviewedSessionsStorage(nextReviewed);
        }

        // Award +15 XP for rating a tutor and persist
        const newPoints = (profile.points || 0) + 15;
        setProfile((prev) => {
          const updated = { ...prev, points: (prev.points || 0) + 15 };
          saveProfileStorage(updated);
          return updated;
        });

        import('@/lib/supabase').then(({ getCurrentSession, submitRating, awardPoints, updateUserProfile }) => {
          if (review.tutorId) {
            submitRating(review.tutorId!, review.rating, review.comment.trim(), review.sessionId)
              .then(async ({ error, isNewRating }) => {
                if (error) {
                  console.warn('Rating submit warning:', error);
                  return;
                }
                if (isNewRating) {
                  await awardPoints('rating_given');
                }
              })
              .catch((err) => console.warn('Rating submit warning:', err));
          }
          getCurrentSession().then((session) => {
            if (session?.user) {
              updateUserProfile(session.user.id, { points: newPoints }).catch(() => {});
            }
          });
        });
      },
    }),
    [
      profile,
      notificationPrefs,
      threads,
      messagesByThread,
      selectedFilters,
      communitiesList,
      sessionsList,
      meetupsList,
      reviewsList,
      reviewedSessionIds,
      theme,
      isLoadingData,
      isRefreshing,
      refreshAll,
      isBootstrapping,
      isAuthenticated,
      markAuthenticated,
      signOut,
      hasSeenOnboarding,
      markOnboardingSeen,
      activityLog,
      loggedHours,
      logStudyMinutes,
    ],
  );

  const renderRoute = () => {
    switch (currentRoute) {
      case 'splash':
        // Rendered as an overlay below, not as a route.
        return null;
      case 'onboarding':
        return (
          <OnboardingScreen
            onSkip={() => {
              markOnboardingSeen();
              replace('welcome');
            }}
            onDone={() => {
              // The final onboarding slide's "Get Started" CTA used to drop
              // the user on the Welcome screen, which just re-shows two more
              // buttons — it looked like "Continue" didn't go anywhere. Send
              // it straight to Sign In, the actual login page.
              markOnboardingSeen();
              replace('signin');
            }}
          />
        );
      case 'welcome':
        return (
          <WelcomeScreen
            onCreateAccount={() => push('signup')}
            onSignIn={() => push('signin')}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            onBack={goBack}
            onContinue={() => {
              markAuthenticated();
              reset('main-home');
            }}
            onSignInClick={() => replace('signin')}
          />
        );
      case 'signin':
        return (
          <SigninScreen
            onBack={goBack}
            onContinue={() => {
              markAuthenticated();
              reset('main-home');
            }}
            onSignUpClick={() => replace('signup')}
          />
        );
      case 'main-home':
        return (
          <MainShell activeTab="home" onTabChange={openTab}>
            <HomeScreen
              onOpenSearch={() => setShowGlobalSearch(true)}
              onOpenNotifications={() => setShowNotifications(true)}
              notificationCount={unreadNotificationCount}
              onOpenFilters={() => push('filters')}
              onOpenProfile={() => push('edit-profile')}
              onOpenLiveSession={(sessionId?: string) => {
                setActiveSessionId(typeof sessionId === 'string' ? sessionId : null);
                push('session-lobby');
              }}
              onOpenCommunity={(communityId?: string) => {
                setActiveCommunityId(typeof communityId === 'string' ? communityId : null);
                push('community-details');
              }}
              onOpenLeaderboard={() => push('leaderboard')}
            />
          </MainShell>
        );
      case 'main-communities':
        return (
          <MainShell activeTab="communities" onTabChange={openTab}>
            <CommunitiesScreen
              onOpenCommunity={(communityId?: string) => {
                setActiveCommunityId(communityId ?? null);
                push('community-details');
              }}
              onCreateCommunity={() => push('create-community')}
            />
          </MainShell>
        );
      case 'main-sessions':
        return (
          <MainShell activeTab="sessions" onTabChange={openTab}>
            <SessionsScreen
              onOpenFilters={() => push('filters')}
              onOpenSchedule={() => push('schedule-session')}
              onOpenCreateMeetup={() => push('create-meetup')}
              onOpenLiveSession={(sessionId?: string) => {
                setActiveSessionId(sessionId ?? null);
                push('session-lobby');
              }}
            />
          </MainShell>
        );
      case 'main-chat':
        return (
          <MainShell activeTab="chat" onTabChange={openTab}>
            <ChatListScreen
              onOpenThread={(id) => {
                if (id) setActiveThreadId(id);
                push('private-chat');
              }}
              onSelectThread={(id) => {
                setActiveThreadId(id);
                push('private-chat');
              }}
            />
          </MainShell>
        );
      case 'main-profile':
        return (
          <MainShell activeTab="profile" onTabChange={openTab}>
            <ProfileScreen
              onEditProfile={() => push('edit-profile')}
              onOpenSettings={() => push('settings')}
              onOpenModeration={() => push('moderation')}
              onSignOut={async () => {
                await signOut();
                // Reset the stack so Back cannot re-enter the signed-in app.
                reset('welcome');
              }}
            />
          </MainShell>
        );
      case 'community-details':
        if (!activeCommunity) return null;
        return (
          <CommunityDetailScreen
            community={activeCommunity}
            onOpenMembers={() => push('community-members')}
            onBack={goBack}
            onOpenChat={async () => {
              // Resolve (or create) the community's REAL chat_threads row so
              // its messages actually satisfy the "public thread" RLS clause
              // — "Open Chat" used to just drop everyone into whatever the
              // default DM thread happened to be, which had nothing to do
              // with this community (SRS 3.7).
              try {
                const { getOrCreateGroupThread } = await import('@/lib/supabase');
                const threadId = await getOrCreateGroupThread(
                  `community:${activeCommunity.id}`,
                  `${activeCommunity.name} · Group Chat`
                );
                if (threadId) setActiveThreadId(threadId);
              } catch (err) {
                console.warn('Community group chat resolve error:', err);
              }
              push('private-chat');
            }}
            onScheduleSession={() => push('schedule-session')}
          />
        );
      case 'create-community':
        return <CreateCommunityScreen onBack={goBack} onCreated={() => replace('main-communities')} />;
      case 'schedule-session':
        return <ScheduleSessionScreen onBack={goBack} onSubmit={() => replace('main-sessions')} />;
      case 'create-meetup':
        return <CreateMeetupScreen onBack={goBack} onCreated={() => replace('main-sessions')} />;
      case 'leaderboard':
        return <LeaderboardScreen onBack={goBack} />;
      case 'filters':
        return <FiltersScreen onBack={goBack} onApply={() => goBack()} />;
      case 'private-chat':
        return <PrivateChatScreen onBack={goBack} threadId={currentThreadId} />;
      case 'session-lobby':
        return (
          <SessionLobbyScreen
            sessionId={activeSessionId ?? undefined}
            onLeave={() => goBack()}
          />
        );
      case 'edit-profile':
        return <EditProfileScreen onBack={goBack} onSave={() => goBack()} />;
      case 'change-password':
        return <ChangePasswordScreen onBack={goBack} onSaved={() => goBack()} />;
      case 'notification-preferences':
        return <NotificationPreferencesScreen onBack={goBack} />;
      case 'settings':
        return (
          <SettingsScreen
            onBack={goBack}
            onEditProfile={() => push('edit-profile')}
            onChangePassword={() => push('change-password')}
            onNotificationPreferences={() => push('notification-preferences')}
          />
        );
      case 'moderation':
        return <ModerationScreen onBack={goBack} />;
      case 'community-members':
        if (!activeCommunity) return null;
        return <CommunityMembersScreen community={activeCommunity} onBack={goBack} />;
      default:
        return null;
    }
  };

  // Keep the native splash up until Inter has loaded, otherwise the first
  // frame renders in the system font and visibly reflows.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppStoreContext.Provider value={store}>
        <ToastProvider>
          <StatusBar style={themeColors.statusBarStyle} />
          <View style={[styles.appShell, { backgroundColor: themeColors.bg }]}>
            {/* Keyed on the route so recovering unmounts the screen that threw. */}
            <ErrorBoundary key={currentRoute} onReset={goBack}>
              <ScreenTransitionContainer routeKey={currentRoute}>
                {renderRoute()}
              </ScreenTransitionContainer>
            </ErrorBoundary>
          </View>
          <GlobalSearchModal
            visible={showGlobalSearch}
            onClose={() => setShowGlobalSearch(false)}
            onNavigate={(route) => push(route)}
          />
          <NotificationCenterModal
            visible={showNotifications}
            onClose={() => {
              setShowNotifications(false);
              // The user may have read (or "mark all read"-ed) notifications
              // while the modal was open — that read-state lives inside the
              // modal itself, so re-fetch the count rather than guessing.
              refreshUnreadCount();
            }}
            onNavigate={(route) => push(route)}
          />
          {showSplash ? (
            <SplashScreen ready={Boolean(entryRoute)} onDone={() => setShowSplash(false)} />
          ) : null}
        </ToastProvider>
      </AppStoreContext.Provider>
    </SafeAreaProvider>
  );
}
