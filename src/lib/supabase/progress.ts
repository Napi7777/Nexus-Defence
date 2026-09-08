/** Attendance records and the learner progress summary (SRS 3.9). */
import { getSupabaseClient } from './client';
import { DEFAULT_AVATAR } from '@/data/mockData';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Records that the user joined a session. Safe to call more than once.
 *
 * sessions.id is a UUID, so a seeded mock id like 'live-1' would be rejected by
 * Postgres and the write would fail silently — guard rather than round-trip.
 */
export async function recordSessionAttendance(
  sessionId: string,
  minutesAttended?: number,
  joinedAtIso?: string
) {
  const client = getSupabaseClient();
  if (!client || !sessionId) return;
  if (!UUID_RE.test(sessionId)) {
    console.warn('Skipping attendance for non-persisted session:', sessionId);
    return;
  }
  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    // Primary: update session_participants (backend migration 0005/0009)
    await client.from('session_participants').upsert({
      session_id: sessionId,
      user_id: userId,
      attended: true,
    }, { onConflict: 'session_id,user_id' });

    // Also support session_attendance if table is used
    const row: any = {
      session_id: sessionId,
      user_id: userId,
    };
    if (joinedAtIso) {
      row.joined_at = joinedAtIso;
    } else {
      row.joined_at = new Date().toISOString();
    }
    if (typeof minutesAttended === 'number') {
      row.minutes_attended = Math.max(0, minutesAttended);
    }

    await client.from('session_attendance').upsert(row, {
      onConflict: 'session_id,user_id',
    }).catch(() => {});
  } catch (err) {
    console.warn('Attendance record warning:', err);
  }
}

/** Updates the real minutes a user spent participating in a session. */
export async function updateSessionAttendanceMinutes(sessionId: string, minutes: number) {
  const client = getSupabaseClient();
  if (!client || !sessionId) return;
  if (!UUID_RE.test(sessionId)) return;
  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    await client
      .from('session_attendance')
      .update({ minutes_attended: Math.max(0, Math.round(minutes)) })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Update attendance minutes warning:', err);
  }
}

export type AttendanceRecord = {
  sessionId: string;
  title: string;
  tag: string;
  joinedAt: string;
  minutes: number;
};

/** The signed-in user's own session history. */
export async function getMyAttendance(limit = 50): Promise<AttendanceRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return [];

    const { data, error } = await client
      .from('session_attendance')
      .select('session_id, joined_at, minutes_attended, sessions(title, tag)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row: any) => ({
      sessionId: row.session_id,
      title: row.sessions?.title || 'Study session',
      tag: row.sessions?.tag || 'General',
      joinedAt: row.joined_at,
      minutes: row.minutes_attended ?? 0,
    }));
  } catch (err) {
    console.warn('Attendance history error:', err);
    return [];
  }
}

export type ProgressSummary = {
  sessionsAttended: number;
  minutesLearned: number;
  pointsEarned: number;
};

export async function getMyProgress(): Promise<ProgressSummary> {
  const empty = { sessionsAttended: 0, minutesLearned: 0, pointsEarned: 0 };
  const client = getSupabaseClient();
  if (!client) return empty;
  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return empty;

    // Check user_progress_summary view (backend migration 0009)
    const summaryRes = await client
      .from('user_progress_summary')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!summaryRes.error && summaryRes.data) {
      const s = summaryRes.data;
      return {
        sessionsAttended: s.sessions_attended ?? 0,
        minutesLearned: (s.sessions_attended ?? 0) * 45, // default estimated learning minutes
        pointsEarned: s.total_points ?? 0,
      };
    }

    const [attendance, points, profileRes] = await Promise.all([
      client.from('session_attendance').select('minutes_attended').eq('user_id', userId),
      client.from('points_ledger').select('points').eq('user_id', userId),
      client.from('profiles').select('points, sessions_count').eq('id', userId).single(),
    ]);

    const rows = attendance.data ?? [];
    const ledgerPoints = (points.data ?? []).reduce((sum: number, r: any) => sum + (r.points ?? 0), 0);
    const profilePoints = profileRes.data?.points ?? 0;
    const totalPoints = Math.max(ledgerPoints, profilePoints);

    return {
      sessionsAttended: rows.length > 0 ? rows.length : (profileRes.data?.sessions_count ?? 0),
      minutesLearned: rows.reduce((sum: number, r: any) => sum + (r.minutes_attended ?? 0), 0),
      pointsEarned: totalPoints,
    };
  } catch (err) {
    console.warn('Progress summary error:', err);
    return empty;
  }
}

/** Tutor-side view: who attended a session you host (SRS 3.9). */
export async function getSessionParticipation(sessionId: string) {
  const client = getSupabaseClient();
  if (!client || !sessionId) return [];
  try {
    const { data, error } = await client
      .from('session_attendance')
      .select('user_id, joined_at, minutes_attended, profiles(full_name, avatar_url)')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.user_id,
      name: row.profiles?.full_name || 'Student',
      avatar: row.profiles?.avatar_url || DEFAULT_AVATAR,
      joinedAt: row.joined_at,
      minutes: row.minutes_attended ?? 0,
    }));
  } catch (err) {
    console.warn('Participation error:', err);
    return [];
  }
}

/**
 * Returns distinct calendar date keys ('YYYY-MM-DD') for which the user has
 * recorded session attendance or points ledger activity in Supabase.
 */
export async function getActiveStudyDates(userId?: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: userData } = await client.auth.getUser();
      resolvedUserId = userData?.user?.id;
    }
    if (!resolvedUserId) return [];

    const [attendanceRes, pointsRes, activityRes] = await Promise.all([
      client
        .from('session_attendance')
        .select('joined_at')
        .eq('user_id', resolvedUserId)
        .order('joined_at', { ascending: false })
        .limit(60),
      client
        .from('points_ledger')
        .select('created_at')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(60),
      client
        .from('learning_activity_log')
        .select('created_at')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(60),
    ]);

    const dateSet = new Set<string>();

    const addIsoDate = (iso?: string) => {
      if (!iso) return;
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateSet.add(`${y}-${m}-${day}`);
    };

    (attendanceRes.data ?? []).forEach((row: any) => addIsoDate(row.joined_at));
    (pointsRes.data ?? []).forEach((row: any) => addIsoDate(row.created_at));
    (activityRes.data ?? []).forEach((row: any) => addIsoDate(row.created_at));

    return Array.from(dateSet);
  } catch (err) {
    console.warn('Active study dates error:', err);
    return [];
  }
}

