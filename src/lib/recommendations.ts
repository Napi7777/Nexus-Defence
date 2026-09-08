import { CommunityItem, SessionItem, UserProfile } from '@/data/mockData';

/**
 * Recommendation scoring (SRS 3.4).
 *
 * The PRD is explicit: ship a simple tag/interest match and do not reach for a
 * learned model before there is activity data to learn from. This is that
 * simple match — pure functions, so the ranking is testable without a database.
 */

/** Weights are relative, not absolute; only their ratio matters. */
const WEIGHT = {
  interest: 3,
  skill: 2,
  joinedNeighbour: 1,
  skillLevel: 2,
} as const;

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function overlapCount(a: string[] = [], b: string[] = []): number {
  if (!a.length || !b.length) return 0;
  const set = new Set(a.map(normalise));
  return b.reduce((count, item) => (set.has(normalise(item)) ? count + 1 : count), 0);
}

/**
 * Splits a community's subject and name into match tokens, so "Advanced
 * Calculus Group" matches an interest of "Calculus".
 */
function tokensFor(community: CommunityItem): string[] {
  return `${community.subject} ${community.name}`
    .split(/[^A-Za-z0-9+#]+/)
    .filter((token) => token.length > 2);
}

export type ScoredCommunity = {
  community: CommunityItem;
  score: number;
  /** Why it was recommended — shown to the user, not just for debugging. */
  reason: string;
};

/**
 * Ranks communities the user has not joined.
 *
 * Returns an empty list rather than filler when nothing matches: a
 * recommendation the system cannot justify is worse than none, because it
 * teaches the user to ignore the section.
 */
export function recommendCommunities(
  profile: Pick<UserProfile, 'interests' | 'skills' | 'skillLevel'>,
  communities: CommunityItem[],
  limit = 3
): ScoredCommunity[] {
  const candidates = communities.filter((c) => !c.joined);

  return candidates
    .map((community) => {
      const tokens = tokensFor(community);
      const interestHits = overlapCount(profile.interests, tokens);
      const skillHits = overlapCount(profile.skills, tokens);

      const score = interestHits * WEIGHT.interest + skillHits * WEIGHT.skill;

      let reason = '';
      if (interestHits > 0) {
        const matched = (profile.interests ?? []).find((i) =>
          tokens.some((t) => normalise(t) === normalise(i))
        );
        reason = `Matches your interest in ${matched}`;
      } else if (skillHits > 0) {
        const matched = (profile.skills ?? []).find((s) =>
          tokens.some((t) => normalise(t) === normalise(s))
        );
        reason = `Related to your ${matched} skills`;
      }

      return { community, score, reason };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.community.name.localeCompare(b.community.name))
    .slice(0, limit);
}

export type ScoredSession = {
  session: SessionItem;
  score: number;
  reason: string;
};

/** Ranks upcoming sessions by tag overlap with the user's interests and skills. */
export function recommendSessions(
  profile: Pick<UserProfile, 'interests' | 'skills'>,
  sessions: SessionItem[],
  limit = 3
): ScoredSession[] {
  return sessions
    .map((session) => {
      const tokens = (session.tag || '').split(/[^A-Za-z0-9+#]+/).filter(Boolean);
      const interestHits = overlapCount(profile.interests, tokens);
      const skillHits = overlapCount(profile.skills, tokens);
      const score = interestHits * WEIGHT.interest + skillHits * WEIGHT.skill;

      return {
        session,
        score,
        reason: score > 0 ? `Because you follow ${session.tag}` : '',
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Ranks tutors for a learner.
 *
 * Someone one level above the learner is the most useful match — a peer at the
 * same level cannot teach much, and an expert several levels up tends to
 * explain past them. That is the whole premise of peer tutoring.
 */
const LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'] as const;

export type ScoredTutor = {
  tutor: UserProfile;
  score: number;
  reason: string;
};

export function recommendTutors(
  profile: Pick<UserProfile, 'interests' | 'skills' | 'skillLevel'>,
  tutors: UserProfile[],
  limit = 5
): ScoredTutor[] {
  const learnerLevel = LEVEL_ORDER.indexOf(profile.skillLevel ?? 'Beginner');

  return tutors
    .map((tutor) => {
      const topics = [...(tutor.skills ?? []), ...(tutor.interests ?? [])];
      const interestHits = overlapCount(profile.interests, topics);
      const skillHits = overlapCount(profile.skills, topics);

      const topicScore = interestHits * WEIGHT.interest + skillHits * WEIGHT.skill;

      const tutorLevel = LEVEL_ORDER.indexOf(tutor.skillLevel ?? 'Beginner');
      const gap = tutorLevel - learnerLevel;
      // One level above scores best; same level or far above score lower. This
      // only ranks tutors who already teach something relevant — on its own it
      // would recommend an Advanced tutor with no overlapping topics at all.
      const levelBonus = topicScore > 0 ? (gap === 1 ? WEIGHT.skillLevel : gap === 2 ? 1 : 0) : 0;

      const score = topicScore > 0 ? topicScore + levelBonus : 0;
      const matched = topics.find((t) =>
        [...(profile.interests ?? []), ...(profile.skills ?? [])].some(
          (own) => normalise(own) === normalise(t)
        )
      );

      return {
        tutor,
        score,
        reason: matched ? `Teaches ${matched}` : '',
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.tutor.rating) - Number(a.tutor.rating))
    .slice(0, limit);
}
