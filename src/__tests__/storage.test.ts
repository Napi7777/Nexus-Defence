import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveThemeStorage,
  loadThemeStorage,
  saveProfileStorage,
  loadProfileStorage,
  saveNotificationPrefsStorage,
  loadNotificationPrefsStorage,
  saveCommunitiesCache,
  loadCommunitiesCache,
} from '@/lib/storage';
import { NotificationPrefs, UserProfile } from '@/data/mockData';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
});

describe('Storage Service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and loads theme mode', async () => {
    await saveThemeStorage('midnight');
    const theme = await loadThemeStorage();
    expect(theme).toBe('midnight');
  });

  it('returns null if theme is not set', async () => {
    const theme = await loadThemeStorage();
    expect(theme).toBeNull();
  });

  it('saves and loads user profile', async () => {
    const mockProfile: UserProfile = {
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
      points: 350,
      sessions: 12,
      communities: 5,
      streak: '5 days',
      avatar: 'https://i.pravatar.cc/100',
    };

    await saveProfileStorage(mockProfile);
    const profile = await loadProfileStorage();
    expect(profile).toEqual(mockProfile);
  });

  it('saves and loads notification preferences', async () => {
    const mockPrefs: NotificationPrefs = {
      sessionReminders: true,
      communityPosts: false,
      meetupUpdates: true,
      directMessages: true,
      badgesAndPoints: false,
      weeklyDigest: false,
      promotions: false,
    };

    await saveNotificationPrefsStorage(mockPrefs);
    const prefs = await loadNotificationPrefsStorage();
    expect(prefs).toEqual(mockPrefs);
  });

  it('saves and loads communities cache', async () => {
    const mockCommunities = [
      {
        id: 'comm-101',
        name: 'Calculus Masters',
        subject: 'Mathematics',
        members: 142,
        posts: 38,
        description: 'Math study group',
        image: 'https://images.unsplash.com/photo-1',
        joined: true,
        postsFeed: [],
      },
    ];

    await saveCommunitiesCache(mockCommunities);
    const cached = await loadCommunitiesCache();
    expect(cached).toEqual(mockCommunities);
  });
});
