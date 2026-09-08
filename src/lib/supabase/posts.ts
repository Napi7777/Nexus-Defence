/** Community discussion posts and shared resources (SRS 3.3). */
import { getSupabaseClient } from './client';
import { CommunityPost } from '@/data/mockData';

/** Formats a timestamp the way the post feed displays it. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export async function getCommunityPosts(communityId: string): Promise<CommunityPost[]> {
  const client = getSupabaseClient();
  if (!client || !communityId) return [];
  try {
    // Primary query against community_posts (backend migration 0004)
    let res = await client
      .from('community_posts')
      .select('*, author:profiles(full_name, role)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(200);

    let rows: any[] = res.data ?? [];

    if ((!rows || rows.length === 0) && res.error) {
      // Fallback to legacy posts table
      const fallback = await client
        .from('posts')
        .select('*, author:profiles(full_name, role)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(200);
      rows = fallback.data ?? [];
    }

    if (!rows) return [];

    return rows.map((row: any) => ({
      id: row.id,
      author: row.author?.full_name || 'Member',
      role: row.author?.role === 'tutor' ? 'Tutor' : 'Student',
      time: relativeTime(row.created_at),
      title: row.title || (row.content ? row.content.slice(0, 40) : ''),
      body: row.content || row.body || '',
      stats: '',
    }));
  } catch (err) {
    console.warn('Error fetching community posts:', err);
    return [];
  }
}

export async function createCommunityPost(
  communityId: string,
  title: string,
  body: string,
  authorId?: string,
  mediaUrl?: string
) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  let userId = authorId;
  if (!userId) {
    const { data: userData } = await client.auth.getUser();
    userId = userData?.user?.id;
  }

  const contentText = body || title;

  // Primary: insert into community_posts (0004)
  const primaryRes = await client
    .from('community_posts')
    .insert([
      {
        community_id: communityId,
        content: contentText,
        author_id: userId || null,
        media_url: mediaUrl || null,
      },
    ])
    .select('*')
    .single();

  if (!primaryRes.error) return primaryRes;

  // Fallback to legacy posts table
  return client
    .from('posts')
    .insert([{ community_id: communityId, title, body, author_id: userId || null }])
    .select('*')
    .single();
}

/** Live post feed for a community. Returns an unsubscribe function. */
export function subscribeToCommunityPosts(
  communityId: string,
  onNewPost: (post: CommunityPost, authorId: string | null) => void
) {
  const client = getSupabaseClient();
  if (!client || !communityId) return () => {};

  const channel = client
    .channel(`public:community_posts:${communityId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'community_posts',
        filter: `community_id=eq.${communityId}`,
      },
      (payload: any) => {
        const row = payload.new;
        onNewPost(
          {
            id: row.id || `post-${Date.now()}`,
            author: 'Member',
            role: 'Student',
            time: 'Just now',
            title: row.title || (row.content ? row.content.slice(0, 40) : ''),
            body: row.content || row.body || '',
            stats: '',
          },
          row.author_id || null
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `community_id=eq.${communityId}`,
      },
      (payload: any) => {
        const row = payload.new;
        onNewPost(
          {
            id: row.id || `post-${Date.now()}`,
            author: 'Member',
            role: 'Student',
            time: 'Just now',
            title: row.title || '',
            body: row.body || '',
            stats: '',
          },
          row.author_id || null
        );
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// --- SHARED RESOURCES (SRS 3.3) ---

export async function createResource(resource: {
  community_id?: string;
  uploader_id?: string;
  title: string;
  kind?: 'file' | 'link';
  url: string;
  mime_type?: string;
  size_bytes?: number;
  description?: string;
}) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  let activeUserId = resource.uploader_id;
  if (!activeUserId) {
    const { data: userData } = await client.auth.getUser();
    activeUserId = userData?.user?.id;
  }

  // Primary: insert to shared_resources (backend migration 0004)
  const sharedRes = await client.from('shared_resources').insert([
    {
      community_id: resource.community_id,
      uploaded_by: activeUserId || null,
      title: resource.title,
      description: resource.description || null,
      file_url: resource.url,
      file_type: resource.kind || resource.mime_type || 'file',
    },
  ]);

  if (!sharedRes.error) return sharedRes;

  // Fallback to legacy resources table
  return client.from('resources').insert([resource]);
}

export async function getCommunityResources(communityId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client || !communityId) return [];
  try {
    // Primary: shared_resources (0004)
    const res = await client
      .from('shared_resources')
      .select('*, uploader:profiles(full_name, avatar_url)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!res.error && res.data && res.data.length > 0) {
      return res.data;
    }

    // Fallback to resources
    const { data, error } = await client
      .from('resources')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return data;
  } catch (err) {
    console.warn('Error fetching resources:', err);
    return [];
  }
}

// --- DISCUSSIONS / COMMENTS (the "discussions" half of SRS 3.3) ---

export type PostComment = {
  id: string;
  postId: string;
  author: string;
  time: string;
  body: string;
};

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const client = getSupabaseClient();
  if (!client || !postId) return [];
  try {
    const { data, error } = await client
      .from('post_comments')
      .select('*, author:profiles(full_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      author: row.author?.full_name || 'Member',
      time: relativeTime(row.created_at),
      body: row.content || row.body || '',
    }));
  } catch (err) {
    console.warn('Error fetching comments:', err);
    return [];
  }
}

export async function createPostComment(postId: string, body: string, authorId?: string) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };

  let userId = authorId;
  if (!userId) {
    const { data: userData } = await client.auth.getUser();
    userId = userData?.user?.id;
  }

  // Primary: content column (0004)
  const primaryRes = await client
    .from('post_comments')
    .insert([{ post_id: postId, content: body, author_id: userId || null }])
    .select('*')
    .single();

  if (!primaryRes.error) return primaryRes;

  // Fallback to body column
  return client
    .from('post_comments')
    .insert([{ post_id: postId, body, author_id: userId || null }])
    .select('*')
    .single();
}
