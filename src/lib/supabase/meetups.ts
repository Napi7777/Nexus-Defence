/** In-person meetups and their RSVPs. */
import { getSupabaseClient } from './client';
import { InPersonMeetup } from '@/data/mockData';

export async function getMeetups(): Promise<InPersonMeetup[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('meetups')
      .select('*, tutor:profiles(full_name, avatar_url), rsvps:meetup_rsvps(count)')
      .order('meetup_at', { ascending: true });

    let rows = data;
    if ((!rows || rows.length === 0) && error) {
      // Fallback query if legacy columns are present
      const fallback = await client
        .from('meetups')
        .select('*, organizer:profiles(full_name, avatar_url)')
        .order('scheduled_at', { ascending: true });
      rows = fallback.data;
    }

    if (!rows || rows.length === 0) return [];

    return rows.map((item: any) => {
      const timeStr = item.meetup_at || item.scheduled_at || item.created_at;
      const count =
        Array.isArray(item.rsvps) && item.rsvps[0]?.count !== undefined
          ? item.rsvps[0].count
          : (item.rsvp_count ?? 0);

      return {
        id: item.id,
        title: item.title,
        organizer: item.tutor?.full_name || item.organizer?.full_name || 'Campus Member',
        location: item.location_name || item.location || 'Campus Center',
        dateTime: timeStr
          ? new Date(timeStr).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'Upcoming',
        rsvpCount: count,
        rsvpStatus: false,
      };
    });
  } catch (err) {
    console.error('Error fetching meetups:', err);
    return [];
  }
}

export async function getUserMeetupRSVPs(userId: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('meetup_rsvps')
      .select('meetup_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((item: any) => item.meetup_id);
  } catch (err) {
    console.error('Error fetching meetup RSVPs:', err);
    return [];
  }
}

export async function rsvpMeetupInSupabase(meetupId: string, userId: string, rsvped: boolean) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  if (rsvped) {
    return client.from('meetup_rsvps').upsert([
      { meetup_id: meetupId, user_id: userId, status: 'going' },
    ], { onConflict: 'meetup_id,user_id' });
  } else {
    return client.from('meetup_rsvps').delete().eq('meetup_id', meetupId).eq('user_id', userId);
  }
}

export async function createMeetupInSupabase(
  title: string,
  location: string,
  scheduledAt: string,
  organizerId?: string,
  communityId?: string,
  description?: string
) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  let activeUserId = organizerId;
  if (!activeUserId) {
    const { data: userData } = await client.auth.getUser();
    activeUserId = userData?.user?.id;
  }

  const payload: Record<string, any> = {
    title,
    location_name: location,
    meetup_at: scheduledAt,
    description: description || null,
  };
  if (activeUserId) payload.tutor_id = activeUserId;
  if (communityId) payload.community_id = communityId;

  const res = await client.from('meetups').insert([payload]).select('*').single();
  if (!res.error) return res;

  // Fallback to legacy structure
  return client.from('meetups').insert([
    {
      title,
      location,
      scheduled_at: scheduledAt,
      organizer_id: activeUserId || null,
    },
  ]);
}
