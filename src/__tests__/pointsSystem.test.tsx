import React from 'react';
import { render } from '@testing-library/react-native';
import { AppStoreContext, AppStore } from '@/context/AppStoreContext';
import { currentUser } from '@/data/mockData';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { LeaderboardScreen } from '@/screens/leaderboard/LeaderboardScreen';

jest.mock('@/lib/supabase', () => ({
  fetchAllProfiles: jest.fn().mockResolvedValue([]),
  getActiveStudyDates: jest.fn().mockResolvedValue([]),
  getIsAdmin: jest.fn().mockResolvedValue(false),
  getMyProgress: jest.fn().mockResolvedValue({
    sessionsAttended: 5,
    minutesLearned: 180,
    pointsEarned: 450,
  }),
  getMyAttendance: jest.fn().mockResolvedValue([]),
  getLeaderboard: jest.fn().mockResolvedValue([
    {
      id: 'usr-current',
      name: 'Elena Rostova',
      avatar: 'https://example.com/elena.jpg',
      university: 'KNUST',
      points: 450,
      sessions: 5,
    },
    {
      id: 'other-user',
      name: 'Alex Chen',
      avatar: 'https://example.com/alex.jpg',
      university: 'KNUST',
      points: 800,
      sessions: 12,
    },
  ]),
  getSupabaseClient: jest.fn().mockReturnValue(null),
}));

describe('Points System Synchronization', () => {
  const baseStore: AppStore = {
    isLoadingData: false,
    isRefreshing: false,
    refreshAll: jest.fn(),
    isBootstrapping: false,
    isAuthenticated: true,
    markAuthenticated: jest.fn(),
    signOut: jest.fn(),
    hasSeenOnboarding: true,
    markOnboardingSeen: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
    profile: {
      ...currentUser,
      points: 450,
      sessions: 5,
      communities: 3,
    },
    updateProfile: jest.fn(),
    notificationPrefs: {
      sessionReminders: true,
      communityPosts: true,
      meetupUpdates: true,
      directMessages: true,
      badgesAndPoints: true,
      weeklyDigest: false,
      promotions: false,
    },
    toggleNotification: jest.fn(),
    threads: [],
    messagesByThread: {},
    sendMessage: jest.fn(),
    selectedFilters: {
      subject: [],
      contentType: [],
      skillLevel: [],
      availability: [],
      minimumRating: [],
    },
    toggleFilter: jest.fn(),
    resetFilters: jest.fn(),
    communitiesList: [],
    toggleJoinCommunity: jest.fn(),
    addCommunity: jest.fn(),
    sessionsList: [],
    addSession: jest.fn(),
    meetupsList: [],
    toggleRSVPMeetup: jest.fn(),
    addMeetup: jest.fn(),
    activityLog: { attendedSession: false, participatedCommunity: false },
    recordActivity: jest.fn(),
    reviewsList: [],
    addReview: jest.fn(),
    reviewedSessionIds: [],
    loggedHours: 1.5,
    logStudyTime: jest.fn(),
    logStudyMinutes: jest.fn(),
  };

  it('renders matching points on HomeScreen', () => {
    const { getByText } = render(
      <AppStoreContext.Provider value={baseStore}>
        <HomeScreen />
      </AppStoreContext.Provider>
    );

    // HomeScreen StatCard for points
    expect(getByText('450')).toBeTruthy();
  });

  it('renders matching points and Level Tier on ProfileScreen', () => {
    const { getByText, getAllByText } = render(
      <AppStoreContext.Provider value={baseStore}>
        <ProfileScreen onEditProfile={jest.fn()} onOpenSettings={jest.fn()} />
      </AppStoreContext.Provider>
    );

    // ProfileScreen StatCard and learning history summary
    const pointsElements = getAllByText('450');
    expect(pointsElements.length).toBeGreaterThanOrEqual(1);

    // Points 450 corresponds to Level 2: Study Mentor (250 - 499)
    expect(getByText('Level 2: Study Mentor')).toBeTruthy();
  });

  it('renders matching points and level tier on LeaderboardScreen', () => {
    const { getByText } = render(
      <AppStoreContext.Provider value={baseStore}>
        <LeaderboardScreen onBack={jest.fn()} />
      </AppStoreContext.Provider>
    );

    expect(getByText(/450 XP/)).toBeTruthy();
    expect(getByText('Level 2: Study Mentor')).toBeTruthy();
  });
});
