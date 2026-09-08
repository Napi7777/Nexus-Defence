import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlobalSearchModal } from '@/components/overlays';
import { AppStoreContext, AppStore } from '@/context/AppStoreContext';

const mockAppStore: AppStore = {
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
    name: 'Alex Chen',
    email: 'alex@nexus.edu',
    university: 'KNUST',
    major: 'Computer Science',
    year: '3rd Year',
    bio: 'Student at Nexus',
    skills: ['React Native', 'TypeScript'],
    interests: [],
    skillLevel: 'Beginner',
    availability: [],
    rating: '4.9',
    points: 450,
    sessions: 24,
    communities: 5,
    streak: '5 days',
    avatar: 'https://i.pravatar.cc/100',
  },
  updateProfile: jest.fn(),
  notificationPrefs: {
    sessionReminders: true,
    communityPosts: true,
    meetupUpdates: true,
    directMessages: true,
    badgesAndPoints: false,
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
  communitiesList: [
    {
      id: 'comm-1',
      name: 'Calculus Masters',
      subject: 'Mathematics',
      members: 142,
      posts: 38,
      description: 'Calculus study group',
      image: 'https://images.unsplash.com/photo-1',
      joined: true,
      postsFeed: [],
    },
    {
      id: 'comm-2',
      name: 'Algorithms & Data Structures',
      subject: 'Computer Science',
      members: 210,
      posts: 64,
      description: 'CS study group',
      image: 'https://images.unsplash.com/photo-2',
      joined: false,
      postsFeed: [],
    },
  ],
  toggleJoinCommunity: jest.fn(),
  addCommunity: jest.fn(),
  sessionsList: [
    {
      id: 'sess-1',
      title: 'Linear Algebra Review',
      tutor: 'Prof. Davis',
      time: 'Today 4:00 PM',
      participants: '18/20',
      image: 'https://images.unsplash.com/photo-3',
      isLive: true,
      tag: 'Math',
    },
  ],
  addSession: jest.fn(),
  meetupsList: [
    {
      id: 'meet-1',
      title: 'Library 3rd Floor Study Group',
      organizer: 'Alex Chen',
      location: 'Main Campus Library',
      dateTime: 'Tomorrow 2:00 PM',
      rsvpCount: 8,
      rsvpStatus: false,
    },
  ],
  toggleRSVPMeetup: jest.fn(),
  addMeetup: jest.fn(),
  activityLog: { attendedSession: false, participatedCommunity: false },
  recordActivity: jest.fn(),
  reviewsList: [],
  addReview: jest.fn(),
  reviewedSessionIds: [],
  loggedHours: 0,
  logStudyTime: jest.fn(),
  logStudyMinutes: jest.fn(),
};

function renderWithStore(ui: React.ReactElement) {
  return render(
    <AppStoreContext.Provider value={mockAppStore}>
      {ui}
    </AppStoreContext.Provider>
  );
}

describe('GlobalSearchModal', () => {
  it('returns null when visible is false', () => {
    const { queryByPlaceholderText } = renderWithStore(
      <GlobalSearchModal visible={false} onClose={jest.fn()} onNavigate={jest.fn()} />
    );
    expect(queryByPlaceholderText('Instant search across NEXUS...')).toBeNull();
  });

  it('renders input and category pills when visible is true', () => {
    const { getByPlaceholderText, getAllByText, getByText } = renderWithStore(
      <GlobalSearchModal visible={true} onClose={jest.fn()} onNavigate={jest.fn()} />
    );

    expect(getByPlaceholderText('Instant search across NEXUS...')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getAllByText('Communities').length).toBeGreaterThan(0);
    expect(getAllByText('Sessions').length).toBeGreaterThan(0);
    expect(getAllByText('Meetups').length).toBeGreaterThan(0);
    expect(getAllByText('Tutors').length).toBeGreaterThan(0);
  });

  it('filters results based on search input query', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderWithStore(
      <GlobalSearchModal visible={true} onClose={jest.fn()} onNavigate={jest.fn()} />
    );

    const input = getByPlaceholderText('Instant search across NEXUS...');
    fireEvent.changeText(input, 'Calculus');

    expect(getByText('Calculus Masters')).toBeTruthy();
    expect(queryByText('Algorithms & Data Structures')).toBeNull();
  });

  it('filters results when category pill is pressed', () => {
    const { getAllByText, getByText, queryByText } = renderWithStore(
      <GlobalSearchModal visible={true} onClose={jest.fn()} onNavigate={jest.fn()} />
    );

    const sessionsPill = getAllByText('Sessions')[0];
    fireEvent.press(sessionsPill);

    expect(getByText('Linear Algebra Review')).toBeTruthy();
    expect(queryByText('Calculus Masters')).toBeNull();
  });

  it('triggers onClose and onNavigate when a search result item is tapped', () => {
    const handleClose = jest.fn();
    const handleNavigate = jest.fn();

    const { getByText } = renderWithStore(
      <GlobalSearchModal visible={true} onClose={handleClose} onNavigate={handleNavigate} />
    );

    const resultRow = getByText('Calculus Masters');
    fireEvent.press(resultRow);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('main-communities');
  });
});
