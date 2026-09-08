/** Points awards and the leaderboard (SRS 3.10). */
import { getSupabaseClient } from './client';
import { DEFAULT_AVATAR } from '@/data/mockData';

export type PointsReason =
  | 'session_attended'
  | 'post_created'
  | 'comment_created'
  | 'resource_shared'
  | 'daily_task'
  | 'meetup_attended'
  | 'community_created'
  | 'rating_given';

/**
 * Awards points for an action.
 *
 * The amount is decided by the award_points() database function, not passed
 * from here — a client that could write the ledger directly could award itself
 * any number of points and top the leaderboard.
 *
 * Returns the points actually granted, or 0 if the call did not go through.
 */
export async function awardPoints(reason: PointsReason, refId?: string): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;
  try {
    const { data, error } = await client.rpc('award_points', {
      p_reason: reason,
      p_ref: refId || null,
    });
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (err) {
    console.warn('Points award warning:', err);
    return 0;
  }
}

export type LeaderboardRow = {
  id: string;
  name: string;
  avatar: string;
  university: string;
  points: number;
  sessions: number;
};

/** Reads the aggregated leaderboard view rather than the mock array. */
export async function getLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.user_id || row.id,
      name: row.full_name || 'Student',
      avatar: row.avatar_url || DEFAULT_AVATAR,
      university: row.university || 'KNUST',
      points: row.total_points ?? 0,
      sessions: row.sessions_attended ?? 0,
    }));
  } catch (err) {
    console.warn('Error fetching leaderboard:', err);
    return [];
  }
}
