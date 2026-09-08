/** Scheduled study sessions. */
import { getSupabaseClient } from './client';
import { SessionItem } from '@/data/mockData';

export async function getSessions(): Promise<SessionItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    // Primary query against live_sessions (backend migration 0005)
    let res = await client
      .from('live_sessions')
      .select(`
        *,
        tutor:profiles(full_name, avatar_url),
        participants:session_participants(count)
      `)
      .order('scheduled_start', { ascending: true });

    let rows: any[] = res.data ?? [];

    // Fallback if live_sessions is not used or empty
    if ((!rows || rows.length === 0) && res.error) {
      const fallbackRes = await client
        .from('sessions')
        .select(`
          *,
          tutor:profiles(full_name, avatar_url)
        `)
        .order('scheduled_at', { ascending: true });
      rows = fallbackRes.data ?? [];
    }

    if (!rows || rows.length === 0) return [];

    return rows.map((item: any) => {
      const startTime = item.scheduled_start || item.scheduled_at;
      const count =
        Array.isArray(item.participants) && item.participants[0]?.count !== undefined
          ? item.participants[0].count
          : (item.participants_count ?? 0);

      const isLive = item.status === 'live' || item.is_live === true;

      return {
        id: item.id,
        title: item.title,
        tutor: item.tutor?.full_name || 'Tutor',
        tutorId: item.tutor_id || undefined,
        time: startTime ? new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled',
        participants: `${count}/${item.max_participants || 20}`,
        tag: item.tag || item.description || 'General',
        image: item.tutor?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        isLive,
      };
    });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    return [];
  }
}

export async function createSession(sessionData: {
  title: string;
  tutor_id: string;
  community_id?: string;
  tag?: string;
  scheduled_at?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes?: number;
  max_participants?: number;
  video_provider?: 'zoom' | 'jitsi' | 'google_meet' | 'other';
  meeting_url?: string;
}) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  const start = sessionData.scheduled_start || sessionData.scheduled_at || new Date().toISOString();
  const durationMin = sessionData.duration_minutes || 60;
  const end = sessionData.scheduled_end || new Date(new Date(start).getTime() + durationMin * 60000).toISOString();

  // Try live_sessions first
  const payload: Record<string, any> = {
    title: sessionData.title,
    tutor_id: sessionData.tutor_id,
    scheduled_start: start,
    scheduled_end: end,
    video_provider: sessionData.video_provider || 'zoom',
    max_participants: sessionData.max_participants || 20,
    status: 'scheduled',
  };
  if (sessionData.community_id) payload.community_id = sessionData.community_id;
  if (sessionData.meeting_url) payload.meeting_url = sessionData.meeting_url;
  if (sessionData.tag) payload.description = sessionData.tag;

  const res = await client.from('live_sessions').insert([payload]).select('*').single();
  if (!res.error) return res;

  // Fallback to legacy sessions table if needed
  return client.from('sessions').insert([{
    title: sessionData.title,
    tutor_id: sessionData.tutor_id,
    community_id: sessionData.community_id || null,
    tag: sessionData.tag || 'General',
    scheduled_at: start,
    duration_minutes: durationMin,
    max_participants: sessionData.max_participants || 20,
  }]);
}

export async function registerForLiveSession(sessionId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client.from('session_participants').insert([{ session_id: sessionId, user_id: userId }]);
}

export async function cancelLiveSessionRegistration(sessionId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client.from('session_participants').delete().eq('session_id', sessionId).eq('user_id', userId);
}
