/** Community membership roster and role management (SRS 3.3). */
import { getSupabaseClient } from './client';
import { DEFAULT_AVATAR } from '@/data/mockData';

export type CommunityMember = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  joinedAt: string;
};

export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  const client = getSupabaseClient();
  if (!client || !communityId) return [];
  try {
    const { data, error } = await client
      .from('community_members')
      .select('user_id, role, joined_at, profiles(full_name, avatar_url)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: true });

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.user_id,
      name: row.profiles?.full_name || 'Member',
      avatar: row.profiles?.avatar_url || DEFAULT_AVATAR,
      role: row.role || 'member',
      joinedAt: row.joined_at,
    }));
  } catch (err) {
    console.warn('Error fetching members:', err);
    return [];
  }
}

/** Owner-only: enforced by the "Owners manage community members" policy. */
export async function removeCommunityMember(communityId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
}

export async function setCommunityMemberRole(
  communityId: string,
  userId: string,
  role: 'member' | 'moderator'
) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client
    .from('community_members')
    .update({ role })
    .eq('community_id', communityId)
    .eq('user_id', userId);
}
