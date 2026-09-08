import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';
import { AppStoreContext, useAppStore, AppStore } from '@/context/AppStoreContext';
import { communities, currentUser, sampleMeetups, threadMessages, threadPreviews, upcomingSessions } from '@/data/mockData';

function TestConsumerComponent() {
  const store = useAppStore();

  return (
    <View testID="test-container">
      <Text testID="user-name">{store.profile.name}</Text>
      <Text testID="user-points">{store.profile.points}</Text>
      <Text testID="theme-mode">{store.theme}</Text>
      <Text testID="community-count">{store.communitiesList.length}</Text>
      <Text testID="session-count">{store.sessionsList.length}</Text>
      <Text testID="meetup-count">{store.meetupsList.length}</Text>
      <Text testID="message-count">
        {(store.messagesByThread['kai'] || []).length}
      </Text>

      <Pressable
        testID="update-name-btn"
        onPress={() => store.updateProfile({ name: 'Taylor Swift' })}
      />
      <Pressable
        testID="toggle-theme-btn"
        onPress={() => store.setTheme('midnight')}
      />
      <Pressable
        testID="add-community-btn"
        onPress={() => store.addCommunity('Physics Masters', 'Physics', 'Quantum Mechanics')}
      />
      <Pressable
        testID="send-message-btn"
        onPress={() => store.sendMessage('kai', 'Hello peer tutor!')}
      />
      <Pressable
        testID="toggle-join-btn"
        onPress={() => store.toggleJoinCommunity(store.communitiesList[0]?.id || '')}
      />
    </View>
  );
}

function TestStoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark' | 'midnight'>('light');
  const [profile, setProfile] = useState(currentUser);
  const [communitiesList, setCommunitiesList] = useState(communities);
  const [sessionsList, setSessionsList] = useState(upcomingSessions);
  const [meetupsList, setMeetupsList] = useState(sampleMeetups);
  const [messagesByThread, setMessagesByThread] = useState(threadMessages);
  const [threads, setThreads] = useState(threadPreviews);

  const value: AppStore = {
    isLoadingData: false,
    isRefreshing: false,
    refreshAll: async () => {},
    isBootstrapping: false,
    isAuthenticated: true,
    markAuthenticated: () => {},
    signOut: async () => {},
    hasSeenOnboarding: true,
    markOnboardingSeen: () => {},
    theme,
    setTheme,
    profile,
    updateProfile: (patch) => setProfile((prev) => ({ ...prev, ...patch })),
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
    threads,
    messagesByThread,
    sendMessage: (threadId, text) => {
      if (!text.trim()) return;
      const newMessage = {
        id: `${threadId}-${Date.now()}`,
        sender: 'me' as const,
        text: text.trim(),
        time: '12:00 PM',
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), newMessage],
      }));
    },
    selectedFilters: {
      subject: [],
      contentType: [],
      skillLevel: [],
      availability: [],
      minimumRating: [],
    },
    toggleFilter: jest.fn(),
    resetFilters: jest.fn(),
    communitiesList,
    toggleJoinCommunity: (communityId) => {
      setCommunitiesList((prev) =>
        prev.map((item) =>
          item.id === communityId
            ? {
                ...item,
                joined: !item.joined,
                members: item.joined ? item.members - 1 : item.members + 1,
              }
            : item
        )
      );
    },
    addCommunity: (name, subject, description) => {
      setCommunitiesList((prev) => [
        ...prev,
        {
          id: `community-${Date.now()}`,
          name,
          subject,
          members: 1,
          posts: 0,
          description,
          image: 'https://images.unsplash.com/photo-1',
          joined: true,
          postsFeed: [],
        },
      ]);
    },
    sessionsList,
    addSession: (title, tag, time) => {
      setSessionsList((prev) => [
        ...prev,
        {
          id: `session-${Date.now()}`,
          title,
          tutor: profile.name,
          time,
          participants: '1/20',
          image: 'https://images.unsplash.com/photo-2',
          isLive: false,
          tag,
        },
      ]);
    },
    meetupsList,
    toggleRSVPMeetup: (meetupId) => {
      setMeetupsList((prev) =>
        prev.map((item) =>
          item.id === meetupId
            ? {
                ...item,
                rsvpStatus: !item.rsvpStatus,
                rsvpCount: item.rsvpStatus ? item.rsvpCount - 1 : item.rsvpCount + 1,
              }
            : item
        )
      );
    },
    addMeetup: (title, location, dateTime) => {
      setMeetupsList((prev) => [
        ...prev,
        {
          id: `meetup-${Date.now()}`,
          title,
          organizer: profile.name,
          location,
          dateTime,
          rsvpCount: 1,
          rsvpStatus: true,
        },
      ]);
    },
    activityLog: { attendedSession: false, participatedCommunity: false },
    recordActivity: () => {},
    reviewsList: [],
    addReview: () => {},
    reviewedSessionIds: [],
    loggedHours: 0,
    logStudyTime: () => {},
    logStudyMinutes: () => {},
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

describe('AppStoreContext Integration', () => {
  it('throws error if useAppStore is used outside Provider', () => {
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => render(<TestConsumerComponent />)).toThrow('AppStoreContext is not available');

    console.error = consoleError;
  });

  it('provides initial state and handles updateProfile', () => {
    const { getByTestId } = render(
      <TestStoreProvider>
        <TestConsumerComponent />
      </TestStoreProvider>
    );

    expect(getByTestId('user-name').children[0]).toBe(currentUser.name);

    fireEvent.press(getByTestId('update-name-btn'));
    expect(getByTestId('user-name').children[0]).toBe('Taylor Swift');
  });

  it('handles theme toggling', () => {
    const { getByTestId } = render(
      <TestStoreProvider>
        <TestConsumerComponent />
      </TestStoreProvider>
    );

    expect(getByTestId('theme-mode').children[0]).toBe('light');

    fireEvent.press(getByTestId('toggle-theme-btn'));
    expect(getByTestId('theme-mode').children[0]).toBe('midnight');
  });

  it('handles adding new communities dynamically', () => {
    const { getByTestId } = render(
      <TestStoreProvider>
        <TestConsumerComponent />
      </TestStoreProvider>
    );

    const initialCount = communities.length;
    expect(Number(getByTestId('community-count').children[0])).toBe(initialCount);

    fireEvent.press(getByTestId('add-community-btn'));
    expect(Number(getByTestId('community-count').children[0])).toBe(initialCount + 1);
  });

  it('handles sending messages in chat thread', () => {
    const { getByTestId } = render(
      <TestStoreProvider>
        <TestConsumerComponent />
      </TestStoreProvider>
    );

    const initialMessageCount = (threadMessages['kai'] || []).length;
    expect(Number(getByTestId('message-count').children[0])).toBe(initialMessageCount);

    fireEvent.press(getByTestId('send-message-btn'));
    expect(Number(getByTestId('message-count').children[0])).toBe(initialMessageCount + 1);
  });
});
