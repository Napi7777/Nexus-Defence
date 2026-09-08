/** Community listing, membership and creation. */
import { getSupabaseClient } from './client';
import { CommunityItem } from '@/data/mockData';

export async function getCommunities(): Promise<CommunityItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('communities')
      .select('*, community_members(count)')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    return data.map((item: any) => {
      const memberCount =
        Array.isArray(item.community_members) && item.community_members[0]?.count !== undefined
          ? item.community_members[0].count
          : (item.members_count ?? 0);

      return {
        id: item.id,
        name: item.name,
        subject: item.subject || 'General Studies',
        members: memberCount,
        posts: item.posts_count ?? 0,
        description: item.description || '',
        image:
          item.cover_image_url ||
          item.image_url ||
          'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
        joined: false,
        postsFeed: [],
      };
    });
  } catch (err) {
    console.error('Error fetching communities:', err);
    return [];
  }
}

export async function getUserJoinedCommunities(userId: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((item: any) => item.community_id);
  } catch (err) {
    console.error('Error fetching user joined communities:', err);
    return [];
  }
}

export async function joinCommunity(communityId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client
    .from('community_members')
    .insert([{ community_id: communityId, user_id: userId }]);
}

export async function leaveCommunity(communityId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
}

export async function createCommunityInSupabase(
  name: string,
  subject: string,
  description: string,
  creatorId?: string,
  coverImageUrl?: string
) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  let activeCreatorId = creatorId;
  if (!activeCreatorId) {
    const { data: userData } = await client.auth.getUser();
    activeCreatorId = userData?.user?.id;
  }

  const rowPayload: Record<string, any> = {
    name,
    description,
    visibility: 'public',
  };
  if (activeCreatorId) rowPayload.created_by = activeCreatorId;
  if (coverImageUrl) rowPayload.cover_image_url = coverImageUrl;

  const res = await client
    .from('communities')
    .insert([rowPayload])
    .select('*')
    .single();

  return res;
}

/** Fetches recommended communities for a user via SQL RPC or fallback. */
export async function getRecommendedCommunities(userId: string, limit = 10): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client || !userId) return [];
  try {
    const { data, error } = await client.rpc('get_recommended_communities', {
      p_user_id: userId,
      p_limit: limit,
    });
    if (error || !data) return [];
    return data;
  } catch (err) {
    console.warn('Recommended communities rpc warning:', err);
    return [];
  }
}
