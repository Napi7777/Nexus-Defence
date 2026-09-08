/** Content reports, the moderation queue and admin checks (SRS 3.12). */
import { getSupabaseClient } from './client';

export type ReportTarget = 'post' | 'comment' | 'message' | 'profile' | 'community';

/** Files a report. Visible only to the reporter and to admins. */
export async function reportContent(
  targetType: ReportTarget,
  targetId: string,
  reason: string
) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { error: new Error('Sign in to report content.') };

    // Target type mapping to report_target_type enum ('post', 'comment', 'message', 'session', 'user', 'meetup', 'resource')
    const mappedType = targetType === 'profile' ? 'user' : targetType === 'community' ? 'resource' : targetType;

    // Primary insert to reports (backend migration 0010)
    const res = await client.from('reports').insert([
      { reported_by: userId, target_type: mappedType, target_id: targetId, reason },
    ]);

    if (!res.error) return { error: null };

    // Fallback to reporter_id if needed
    const fallbackRes = await client.from('reports').insert([
      { reporter_id: userId, target_type: targetType, target_id: targetId, reason },
    ]);
    return { error: fallbackRes.error };
  } catch (err: any) {
    return { error: err };
  }
}

export type ModerationReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
};

/** Admin queue. RLS returns only the caller's own reports unless they are an admin. */
export async function getOpenReports(): Promise<ModerationReport[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('reports')
      .select('*')
      .in('status', ['pending', 'reviewed', 'open', 'reviewing'])
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.warn('Reports fetch error:', err);
    return [];
  }
}

/** Admin-only: enforced by the "Admins resolve reports" policy. */
export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed' | 'actioned') {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  const { data: userData } = await client.auth.getUser();
  const dbStatus = status === 'resolved' ? 'actioned' : status;
  return client
    .from('reports')
    .update({
      status: dbStatus,
      reviewed_by: userData?.user?.id ?? null,
      resolved_by: userData?.user?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId);
}

/**
 * Admin-only: removes a single piece of reported content outright.
 */
export async function deleteReportedContent(
  targetType: ReportTarget,
  targetId: string
): Promise<{ error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };

  const tables =
    targetType === 'post'
      ? ['community_posts', 'posts']
      : targetType === 'comment'
      ? ['post_comments']
      : targetType === 'message'
      ? ['messages']
      : [];

  if (tables.length === 0) {
    return { error: new Error(`Removing a ${targetType} directly isn't supported yet.`) };
  }

  for (const table of tables) {
    const { error } = await client.from(table).delete().eq('id', targetId);
    if (!error) return { error: null };
  }

  return { error: null };
}

/**
 * Admin-only: suspends or restores a user's account (SRS 3.12).
 */
export async function setUserBanned(userId: string, banned: boolean): Promise<{ error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  const { error } = await client.from('profiles').update({ is_banned: banned }).eq('id', userId);
  return { error };
}

/**
 * Whether a given account has been suspended by an admin.
 */
export async function checkAccountBanned(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;
  try {
    const { data } = await client.from('profiles').select('is_banned').eq('id', userId).single();
    return Boolean(data?.is_banned);
  } catch {
    return false;
  }
}

/** Whether the signed-in user can see the moderation queue. */
export async function getIsAdmin(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    // 1. Try is_admin() RPC function (backend migration 0002)
    const rpcRes = await client.rpc('is_admin');
    if (!rpcRes.error && typeof rpcRes.data === 'boolean') {
      return rpcRes.data;
    }

    // 2. Query profiles.role = 'admin' or profiles.is_admin
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return false;

    const { data } = await client
      .from('profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .single();

    return data?.role === 'admin' || Boolean(data?.is_admin);
  } catch {
    return false;
  }
}
