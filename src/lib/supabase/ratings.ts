/** Tutor ratings & reviews (SRS 3.10). */
import { getSupabaseClient } from './client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RatingResult = {
  error: Error | null;
  /** True only the very first time this rater has ever rated this tutor.
   * `ratings` has UNIQUE (tutor_id, rater_id) — one row per pair, ever — so a
   * second rating of the same tutor UPDATEs that row instead of inserting a
   * new one. Points must only ever pay out on that first insert: awarding
   * them on every update would let a session be re-rated over and over for
   * free XP, exactly the farming hole `award_points()` exists to close
   * everywhere else in the app. */
  isNewRating: boolean;
};

/**
 * Inserts or updates the signed-in user's rating of a tutor.
 *
 * `sessionId` is only recorded when it is a real, persisted session id — the
 * live-session rating flow can be reached from a locally-seeded session whose
 * id (e.g. "session-172...") is not a UUID, and passing that straight to a
 * `UUID` column would fail the whole write rather than just omit the link.
 */
export async function submitRating(
  tutorId: string,
  rating: number,
  comment: string,
  sessionId?: string
): Promise<RatingResult> {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured'), isNewRating: false };
  if (!tutorId) return { error: new Error('Missing tutor.'), isNewRating: false };

  try {
    const { data: userData } = await client.auth.getUser();
    const raterId = userData?.user?.id;
    if (!raterId) return { error: new Error('Sign in to leave a rating.'), isNewRating: false };
    if (raterId === tutorId) {
      return { error: new Error('You cannot rate yourself.'), isNewRating: false };
    }

    // Check ratings_reviews (backend migration 0009)
    const { data: existingReview } = await client
      .from('ratings_reviews')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('rated_by', raterId)
      .maybeSingle();

    const reviewRes = await client.from('ratings_reviews').upsert(
      {
        tutor_id: tutorId,
        rated_by: raterId,
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        review_text: comment,
        session_id: sessionId && UUID_RE.test(sessionId) ? sessionId : null,
      },
      { onConflict: 'tutor_id,rated_by,session_id' }
    );

    if (!reviewRes.error) {
      return { error: null, isNewRating: !existingReview };
    }

    // Fallback to legacy ratings table if needed
    const { data: existing } = await client
      .from('ratings')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('rater_id', raterId)
      .maybeSingle();

    const { error } = await client.from('ratings').upsert(
      {
        tutor_id: tutorId,
        rater_id: raterId,
        rating,
        comment,
        session_id: sessionId && UUID_RE.test(sessionId) ? sessionId : null,
      },
      { onConflict: 'tutor_id,rater_id' }
    );

    if (error) return { error, isNewRating: false };
    return { error: null, isNewRating: !existing };
  } catch (err: any) {
    return { error: err, isNewRating: false };
  }
}
