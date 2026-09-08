/** Reading, updating and searching user profiles (SRS 3.11). */
import { getSupabaseClient } from './client';
import { DEFAULT_AVATAR, UserProfile } from '@/data/mockData';

/**
 * Maps a `profiles` row onto the app's UserProfile shape, filling in the
 * defaults a half-completed row leaves out.
 *
 * `defaultSkills` differs by caller: the signed-in user's own profile seeds a
 * starter set so their profile screen is never blank, while list views show
 * only what a person actually declared.
 */
function mapProfileRow(row: any, defaultSkills: string[] = []): UserProfile {
  return {
    id: row.id,
    name: row.full_name || 'User',
    email: row.email || '',
    university: row.university || 'KNUST',
    major: row.major || 'Computer Science',
    year: row.year || '1st Year',
    bio: row.bio || '',
    skills: Array.isArray(row.skills) ? row.skills : defaultSkills,
    interests: Array.isArray(row.interests) ? row.interests : [],
    skillLevel: row.skill_level || 'Beginner',
    availability: Array.isArray(row.availability) ? row.availability : [],
    rating: row.rating ? String(row.rating) : '5.0',
    points: row.points ?? 0,
    sessions: row.sessions_count ?? 0,
    communities: row.communities_count ?? 0,
    streak: row.streak || '0 days',
    avatar: row.avatar_url || DEFAULT_AVATAR,
  };
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    // Attempt detailed fetch with skills/interests joins as defined in backend migration 0002
    let data: any = null;
    let queryError: any = null;

    const resWithJoins = await client
      .from('profiles')
      .select('*, user_skills(*, tags(name)), user_interests(tags(name))')
      .eq('id', userId)
      .maybeSingle();

    if (!resWithJoins.error && resWithJoins.data) {
      data = resWithJoins.data;
      // Extract skills and interests from relations if present
      if (Array.isArray(data.user_skills)) {
        data.skills = data.user_skills.map((s: any) => s.tags?.name || s.name).filter(Boolean);
        const teachSkill = data.user_skills.find((s: any) => s.can_teach);
        if (teachSkill?.level) {
          data.skill_level = teachSkill.level.charAt(0).toUpperCase() + teachSkill.level.slice(1);
        }
      }
      if (Array.isArray(data.user_interests)) {
        data.interests = data.user_interests.map((i: any) => i.tags?.name || i.name).filter(Boolean);
      }
    } else {
      // Fallback to simple select
      const simpleRes = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      data = simpleRes.data;
      queryError = simpleRes.error;
    }

    if (queryError || !data) {
      // Fall back to Auth metadata
      const { data: userData } = await client.auth.getUser();
      if (userData?.user && userData.user.id === userId) {
        const u = userData.user;
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User';
        return {
          id: userId,
          name,
          email: u.email || '',
          university: 'KNUST',
          major: 'Computer Science',
          year: '1st Year',
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
          avatar: u.user_metadata?.avatar_url || DEFAULT_AVATAR,
        };
      }
      return null;
    }

    return { ...mapProfileRow(data, []), id: userId };
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<{
  full_name: string;
  university: string;
  major: string;
  year: string;
  bio: string;
  avatar_url: string;
  skills: string[];
  interests: string[];
  skill_level: string;
  availability: string[];
  streak: string;
  points: number;
}>) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  // Only pass profile table fields to prevent schema errors
  const allowedUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.full_name !== undefined) allowedUpdates.full_name = updates.full_name;
  if (updates.university !== undefined) allowedUpdates.university = updates.university;
  if (updates.bio !== undefined) allowedUpdates.bio = updates.bio;
  if (updates.avatar_url !== undefined) allowedUpdates.avatar_url = updates.avatar_url;

  return client
    .from('profiles')
    .update(allowedUpdates)
    .eq('id', userId);
}

export type TutorSearchFilters = {
  subjects?: string[];
  skillLevels?: string[];
  availability?: string[];
};

/**
 * Finds tutors matching the filter chips. The filters screen collected these
 * and never applied them to anything.
 */
export async function searchTutors(filters: TutorSearchFilters): Promise<UserProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    let query = client.from('profiles').select('*');

    if (filters.subjects?.length) {
      // Match if any declared skill or interest overlaps the chosen subjects.
      // Values are quoted: an unquoted subject containing a space or comma
      // (e.g. "Computer Science") would corrupt the filter expression.
      const list = filters.subjects
        .map((s) => `"${s.replace(/"/g, '')}"`)
        .join(',');
      query = query.or(`skills.ov.{${list}},interests.ov.{${list}}`);
    }
    if (filters.skillLevels?.length) {
      query = query.in('skill_level', filters.skillLevels);
    }
    if (filters.availability?.length) {
      query = query.overlaps('availability', filters.availability);
    }

    const { data, error } = await query.limit(50);
    if (error || !data) return [];

    return data.map((d: any) => mapProfileRow(d));
  } catch (err) {
    console.warn('Tutor search error:', err);
    return [];
  }
}

export async function fetchAllProfiles(currentUserId?: string): Promise<UserProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    let query = client.from('profiles').select('*');
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((d: any) => mapProfileRow(d));
  } catch (err) {
    console.error('Error fetching registered profiles:', err);
    return [];
  }
}
