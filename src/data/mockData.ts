export type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
};

export type SessionItem = {
  id: string;
  title: string;
  tutor: string;
  /** The tutor's real profile id, when this session came from Supabase — used
   * to attribute a post-session rating (SRS 3.10) to the right account rather
   * than just a display name that could collide or go stale. */
  tutorId?: string;
  time: string;
  participants: string;
  tag: string;
  image: string;
  isLive?: boolean;
};

export type CommunityPost = {
  id: string;
  author: string;
  role?: string;
  time: string;
  title: string;
  body: string;
  stats: string;
};

export type CommunityItem = {
  id: string;
  name: string;
  subject: string;
  members: number;
  posts: number;
  description: string;
  image: string;
  joined?: boolean;
  postsFeed: CommunityPost[];
};

export type ThreadPreview = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  avatar: string;
  online?: boolean;
  isGroup?: boolean;
};

export type MessageItem = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  /** Storage object path in the resources bucket, signed at read time. */
  attachmentPath?: string;
  attachmentName?: string;
  attachmentType?: string;
};

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type UserProfile = {
  id?: string;
  name: string;
  email: string;
  university: string;
  major: string;
  year: string;
  bio: string;
  skills: string[];
  /** SRS 3.1 requires interests alongside skills — they drive recommendations. */
  interests: string[];
  /** SRS 3.1: self-declared proficiency, also a recommendation input. */
  skillLevel: SkillLevel;
  /** SRS 3.11: a search filter ("Availability") — free-form slots like
   * "Weekday evenings", stored as `profiles.availability` (text[]). */
  availability: string[];
  rating: string;
  points: number;
  sessions: number;
  communities: number;
  streak: string;
  avatar: string;
};

export type NotificationPrefs = {
  sessionReminders: boolean;
  communityPosts: boolean;
  meetupUpdates: boolean;
  directMessages: boolean;
  badgesAndPoints: boolean;
  weeklyDigest: boolean;
  promotions: boolean;
};

export const brand = {
  name: 'NEXUS',
  tagline: 'Connect · Learn · Grow',
  primary: '#2C2FA3',
  secondary: '#F4F2EE',
  text: '#17161C',
  muted: '#70707B',
  border: '#E8E4DE',
  success: '#59B980',
  danger: '#E45A4F',
};

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'learn',
    title: 'Learn from your peers',
    description:
      'Connect with top-rated student tutors in your university who truly understand the curriculum.',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'live',
    title: 'Join live sessions',
    description:
      'Attend interactive video sessions, ask questions in real time, and grow with your community.',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'share',
    title: 'Share skills locally',
    description:
      'Discover students nearby with practical skills, study groups, and collaboration opportunities.',
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  },
];

export const DEFAULT_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

export const currentUser: UserProfile = {
  name: 'Learner',
  email: '',
  university: '',
  major: '',
  year: '',
  bio: '',
  skills: [],
  interests: [],
  skillLevel: 'Beginner',
  availability: [],
  rating: '5.0',
  points: 0,
  sessions: 0,
  communities: 0,
  streak: '0 days',
  avatar: DEFAULT_AVATAR,
};

export const liveSession: SessionItem = {
  id: 'live-study-room',
  title: 'Live Study Room',
  tutor: 'Peer Tutor',
  time: 'Live',
  participants: 'Live',
  tag: 'LIVE NOW',
  image: DEFAULT_AVATAR,
  isLive: true,
};

export const upcomingSessions: SessionItem[] = [];

export const communities: CommunityItem[] = [];

export const threadPreviews: ThreadPreview[] = [];

export const threadMessages: Record<string, MessageItem[]> = {};

export const defaultNotificationPrefs: NotificationPrefs = {
  sessionReminders: true,
  communityPosts: true,
  meetupUpdates: true,
  directMessages: true,
  badgesAndPoints: false,
  weeklyDigest: false,
  promotions: false,
};

export const filterSections = {
  subject: ['Mathematics', 'Physics', 'CS', 'Chemistry', 'Biology', 'Economics'],
  contentType: ['Live Session', 'Recorded', 'Community', 'Meetup', 'Tutor'],
  skillLevel: ['Beginner', 'Intermediate', 'Advanced'],
  availability: ['Today', 'This week', 'Weekends', 'Mornings', 'Evenings'],
  minimumRating: ['Any', '3+', '4+', '4.5+'],
};

export const profileBadges = [
  { id: 'b1', icon: 'zap', label: 'Early\nAdopter' },
  { id: 'b2', icon: 'star', label: 'Top\nContributor' },
  { id: 'b3', icon: 'award', label: '10\nSessions' },
];

export type InPersonMeetup = {
  id: string;
  title: string;
  organizer: string;
  location: string;
  dateTime: string;
  rsvpCount: number;
  rsvpStatus?: boolean;
  latitude?: number;
  longitude?: number;
  mapCoordX?: number;
  mapCoordY?: number;
  landmark?: string;
  walkingDistance?: string;
  directions?: string[];
};

export type LeaderboardUser = {
  rank: number;
  name: string;
  role: string;
  points: number;
  avatar: string;
};

export type Review = {
  id: string;
  /** The student who left the review. */
  author: string;
  /** The tutor being reviewed — never the review's own author. */
  tutorName?: string;
  rating: number;
  comment: string;
  date: string;
};

export const sampleMeetups: InPersonMeetup[] = [];

export const sampleLeaderboard: LeaderboardUser[] = [];

