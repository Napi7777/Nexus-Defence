import { CommunityItem, SessionItem, UserProfile } from '@/data/mockData';
import {
  recommendCommunities,
  recommendSessions,
  recommendTutors,
} from '@/lib/recommendations';

function community(over: Partial<CommunityItem> & { id: string; name: string; subject: string }): CommunityItem {
  return {
    members: 10,
    posts: 2,
    description: '',
    image: '',
    joined: false,
    postsFeed: [],
    ...over,
  };
}

function tutor(over: Partial<UserProfile> & { name: string }): UserProfile {
  return {
    email: '',
    university: 'KNUST',
    major: 'CS',
    year: '3rd Year',
    bio: '',
    skills: [],
    interests: [],
    availability: [],
    skillLevel: 'Intermediate',
    rating: '4.5',
    points: 0,
    sessions: 0,
    communities: 0,
    streak: '',
    avatar: '',
    ...over,
  };
}

const learner = {
  interests: ['Calculus', 'Algorithms'],
  skills: ['Python'],
  skillLevel: 'Beginner' as const,
};

describe('recommendCommunities', () => {
  const communities = [
    community({ id: 'c1', name: 'Advanced Calculus Group', subject: 'Mathematics' }),
    community({ id: 'c2', name: 'Python Beginners', subject: 'Programming' }),
    community({ id: 'c3', name: 'Medieval Poetry', subject: 'Literature' }),
  ];

  it('ranks an interest match above a skill match', () => {
    const results = recommendCommunities(learner, communities);
    expect(results[0].community.id).toBe('c1');
    expect(results[1].community.id).toBe('c2');
  });

  it('returns nothing rather than filler when nothing matches', () => {
    // An unjustifiable recommendation teaches the user to ignore the section.
    const results = recommendCommunities(
      { interests: ['Zoology'], skills: [], skillLevel: 'Beginner' },
      [communities[2]]
    );
    expect(results).toEqual([]);
  });

  it('never recommends a community the user already joined', () => {
    const joined = communities.map((c) => ({ ...c, joined: true }));
    expect(recommendCommunities(learner, joined)).toEqual([]);
  });

  it('explains why it recommended each one', () => {
    const [top] = recommendCommunities(learner, communities);
    expect(top.reason).toBe('Matches your interest in Calculus');
  });

  it('matches case-insensitively and inside multi-word names', () => {
    const results = recommendCommunities(
      { interests: ['calculus'], skills: [], skillLevel: 'Beginner' },
      [community({ id: 'c1', name: 'Advanced CALCULUS Group', subject: 'Maths' })]
    );
    expect(results).toHaveLength(1);
  });

  it('respects the limit', () => {
    expect(recommendCommunities(learner, communities, 1)).toHaveLength(1);
  });
});

describe('recommendSessions', () => {
  const sessions: SessionItem[] = [
    { id: 's1', title: 'DP Masterclass', tutor: 'A', time: '4pm', participants: '2/10', tag: 'Algorithms', image: '' },
    { id: 's2', title: 'Poetry Hour', tutor: 'B', time: '5pm', participants: '1/10', tag: 'Literature', image: '' },
  ];

  it('surfaces only sessions matching the learner', () => {
    const results = recommendSessions(learner, sessions);
    expect(results).toHaveLength(1);
    expect(results[0].session.id).toBe('s1');
    expect(results[0].reason).toBe('Because you follow Algorithms');
  });
});

describe('recommendTutors', () => {
  it('prefers a tutor one level above the learner over one far above', () => {
    // Peer tutoring works best just above the learner: a same-level peer cannot
    // teach much, and an expert several levels up explains past them.
    const results = recommendTutors(learner, [
      tutor({ name: 'Same level', skills: ['Calculus'], skillLevel: 'Beginner' }),
      tutor({ name: 'One above', skills: ['Calculus'], skillLevel: 'Intermediate' }),
    ]);
    expect(results[0].tutor.name).toBe('One above');
  });

  it('excludes tutors with no topic overlap', () => {
    const results = recommendTutors(learner, [
      tutor({ name: 'Unrelated', skills: ['Botany'], skillLevel: 'Advanced' }),
    ]);
    expect(results).toEqual([]);
  });

  it('breaks ties on rating', () => {
    const results = recommendTutors(learner, [
      tutor({ name: 'Lower rated', skills: ['Calculus'], skillLevel: 'Intermediate', rating: '3.9' }),
      tutor({ name: 'Higher rated', skills: ['Calculus'], skillLevel: 'Intermediate', rating: '4.9' }),
    ]);
    expect(results[0].tutor.name).toBe('Higher rated');
  });
});
