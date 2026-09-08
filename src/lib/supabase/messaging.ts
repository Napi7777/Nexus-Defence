/** Chat threads, messages and realtime subscriptions. */
import { getSupabaseClient } from './client';
import {
  DEFAULT_AVATAR,
  MessageItem,
  ThreadPreview,
  UserProfile,
} from '@/data/mockData';

export async function getMessages(threadId: string, currentUserId?: string): Promise<MessageItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    let activeUserId = currentUserId;
    if (!activeUserId) {
      const { data: userData } = await client.auth.getUser();
      activeUserId = userData?.user?.id;
    }

    // Try querying by conversation_id first (backend migration 0007), fallback to thread_id
    let res = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', threadId)
      .order('created_at', { ascending: true })
      .limit(500);

    let rows = res.data;
    if ((!rows || rows.length === 0) && res.error) {
      const fallbackRes = await client
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(500);
      rows = fallbackRes.data;
    }

    if (!rows) return [];

    return rows.map((msg: any) => ({
      id: msg.id,
      sender: activeUserId && msg.sender_id === activeUserId ? 'me' : 'them',
      text: msg.content || '',
      time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentPath: msg.attachment_url || msg.attachment_path || undefined,
      attachmentName: msg.attachment_name || undefined,
      attachmentType: msg.attachment_type || undefined,
    }));
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
}

export type MessageAttachment = {
  path: string;
  name: string;
  mimeType?: string;
};

export async function sendSupabaseMessage(
  threadId: string,
  text: string,
  senderId?: string,
  attachment?: MessageAttachment
) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };
  let activeSenderId = senderId;
  if (!activeSenderId) {
    const { data: userData } = await client.auth.getUser();
    activeSenderId = userData?.user?.id;
  }

  // Primary insert with conversation_id (0007)
  const primaryPayload: Record<string, any> = {
    conversation_id: threadId,
    content: text,
    sender_id: activeSenderId || null,
  };
  if (attachment?.path) primaryPayload.attachment_url = attachment.path;

  const res = await client.from('messages').insert([primaryPayload]);
  if (!res.error) return res;

  // Fallback to legacy payload if thread_id is required
  return client.from('messages').insert([
    {
      thread_id: threadId,
      content: text,
      sender_id: activeSenderId || null,
      created_at: new Date().toISOString(),
      attachment_path: attachment?.path ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.mimeType ?? null,
    },
  ]);
}

export function subscribeToThreadMessages(
  threadId: string,
  onNewMessage: (msg: MessageItem) => void,
  currentUserId?: string
) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel(`public:messages:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload: any) => {
        const newMsg = payload.new;
        if (newMsg.conversation_id !== threadId && newMsg.thread_id !== threadId) return;

        const isMe = Boolean(currentUserId && newMsg.sender_id === currentUserId);
        onNewMessage({
          id: newMsg.id || `msg-${Date.now()}`,
          sender: isMe ? 'me' : 'them',
          text: newMsg.content || newMsg.body || '',
          time: new Date(newMsg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachmentPath: newMsg.attachment_url || newMsg.attachment_path || undefined,
          attachmentName: newMsg.attachment_name || undefined,
          attachmentType: newMsg.attachment_type || undefined,
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function createChatThread(participantIds: string[], title?: string, isGroup: boolean = false) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };
  try {
    const { data: userData } = await client.auth.getUser();
    const creatorId = userData?.user?.id || participantIds[0];

    // Try conversations (0007)
    try {
      const convRes = await client
        .from('conversations')
        .insert([{ title, is_group: isGroup, created_by: creatorId }])
        .select('*')
        .single();

      if (convRes?.data) {
        const participants = participantIds.map((userId) => ({
          conversation_id: convRes.data.id,
          user_id: userId,
        }));
        await client.from('conversation_participants').insert(participants).catch(() => {});
        return { data: convRes.data, error: null };
      }
    } catch {
      // fallback below
    }

    // Fallback to legacy chat_threads
    const { data: thread, error: threadErr } = await client
      .from('chat_threads')
      .insert([{ title, is_group: isGroup }])
      .select('*')
      .single();

    if (threadErr || !thread) return { data: null, error: threadErr };

    const participants = participantIds.map((userId) => ({
      thread_id: thread.id,
      user_id: userId,
    }));

    const { error: partErr } = await client.from('chat_participants').insert(participants);
    if (partErr) return { data: null, error: partErr };

    return { data: thread, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function getOrCreateDirectThread(currentUserId: string, recipientUser: UserProfile) {
  const client = getSupabaseClient();
  const recipientId = recipientUser.id;

  /** A thread row as the chat list renders it. Only id, preview and time vary. */
  const preview = (id: string, previewText: string, time: string) => ({
    id,
    name: recipientUser.name,
    preview: previewText,
    time,
    avatar: recipientUser.avatar,
    online: true,
  });

  if (!client || !recipientId) {
    return preview(
      `thread-${recipientUser.name.toLowerCase().replace(/\s+/g, '-')}`,
      'Tap to send a live message...',
      'Just now',
    );
  }

  try {
    // Check existing threads shared between currentUserId and recipientId
    const { data: myThreads } = await client
      .from('chat_participants')
      .select('thread_id')
      .eq('user_id', currentUserId);

    if (myThreads && myThreads.length > 0) {
      const myThreadIds = myThreads.map((t: any) => t.thread_id);
      const { data: common } = await client
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', recipientId)
        .in('thread_id', myThreadIds);

      if (common && common.length > 0) {
        return preview(common[0].thread_id, 'Tap to view live messages...', 'Active');
      }
    }

    // Create new direct thread
    const res = await createChatThread([currentUserId, recipientId], recipientUser.name, false);
    if (res.data) {
      return preview(res.data.id, 'New conversation started', 'Just now');
    }
  } catch (err) {
    console.error('Error resolving direct thread:', err);
  }

  return preview(`thread-${recipientId}`, 'Tap to send a live message...', 'Just now');
}

/**
 * Finds or creates the REAL `chat_threads` row for a broadcast room — a
 * community's group chat, a live session's in-call chat — keyed by a stable
 * `group_key` (e.g. `"community:<id>"`, `"session:<id>"`).
 *
 * `messages.thread_id` is free-form TEXT, and the messages SELECT policy only
 * treats a thread as public/broadcast when its id matches a REAL
 * `chat_threads` row with `is_public = TRUE` — a client that only ever
 * invented a string like `community-<id>` (never inserting that row)
 * satisfied neither half of that policy, so reads on the "group chat" came
 * back empty for everyone. This resolves (and, the first time, creates) the
 * real row so group chat actually works under RLS, not just in a build with
 * RLS off.
 */
export async function getOrCreateGroupThread(groupKey: string, title?: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || !groupKey) return null;

  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;

    const { data: existing } = await client
      .from('chat_threads')
      .select('id')
      .eq('group_key', groupKey)
      .maybeSingle();

    let threadId: string | null = existing?.id ?? null;

    if (!threadId) {
      const { data: created, error } = await client
        .from('chat_threads')
        .insert([{ group_key: groupKey, title, is_group: true, is_public: true }])
        .select('id')
        .single();

      if (created?.id) {
        threadId = created.id;
      } else {
        // group_key is uniquely indexed — a concurrent first-opener of the
        // same room most likely won the insert race. Read it back rather
        // than surfacing that as a failure.
        const { data: raced } = await client
          .from('chat_threads')
          .select('id')
          .eq('group_key', groupKey)
          .maybeSingle();
        threadId = raced?.id ?? null;
        if (!threadId) console.warn('Error creating group thread:', error);
      }
    }

    if (threadId && userId) {
      try {
        await client
          .from('chat_participants')
          .upsert([{ thread_id: threadId, user_id: userId }], {
            onConflict: 'thread_id,user_id',
            ignoreDuplicates: true,
          });
      } catch (err) {
        // Non-fatal — the thread is still readable/writable via is_public
        // even if this participant row never lands.
        console.warn('Error joining group thread:', err);
      }
    }

    return threadId;
  } catch (err) {
    console.warn('Error resolving group thread:', err);
    return null;
  }
}

export async function getUserThreads(userId: string): Promise<ThreadPreview[]> {
  const client = getSupabaseClient();
  if (!client || !userId) return [];
  try {
    // Try conversation_participants (0007)
    try {
      const convParts = await client
        .from('conversation_participants')
        .select('conversation_id, conversations(*)')
        .eq('user_id', userId);

      if (convParts?.data && Array.isArray(convParts.data) && convParts.data.length > 0) {
        const threads = convParts.data.map((item: any) => item.conversations).filter(Boolean);
        if (threads.length > 0) {
          const previews = await Promise.all(
            threads.map(async (threadObj: any) => {
              const [{ data: otherParts }, { data: lastMsgs }] = await Promise.all([
                client
                  .from('conversation_participants')
                  .select('user_id, profiles(*)')
                  .eq('conversation_id', threadObj.id)
                  .neq('user_id', userId),
                client
                  .from('messages')
                  .select('*')
                  .eq('conversation_id', threadObj.id)
                  .order('created_at', { ascending: false })
                  .limit(1),
              ]);

              const otherUser = otherParts && otherParts.length > 0 ? (otherParts[0].profiles as any) : null;
              const lastMsg = lastMsgs && lastMsgs.length > 0 ? lastMsgs[0] : null;

              return {
                id: threadObj.id,
                name: otherUser?.full_name || threadObj.title || 'Chat',
                preview: lastMsg?.content || 'No messages yet',
                time: lastMsg?.created_at
                  ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Now',
                avatar: otherUser?.avatar_url || DEFAULT_AVATAR,
                online: true,
                isGroup: threadObj.is_group ?? false,
              } satisfies ThreadPreview;
            })
          );
          return previews;
        }
      }
    } catch {
      // fallback below
    }

    // Fallback to legacy chat_participants
    const { data: parts, error } = await client
      .from('chat_participants')
      .select('thread_id, chat_threads(*)')
      .eq('user_id', userId);

    if (error || !parts) return [];

    const threads = parts.map((item: any) => item.chat_threads).filter(Boolean);

    const threadPreviewsList = await Promise.all(
      threads.map(async (threadObj: any) => {
        const [{ data: otherParts }, { data: lastMsgs }] = await Promise.all([
          client
            .from('chat_participants')
            .select('user_id, profiles(*)')
            .eq('thread_id', threadObj.id)
            .neq('user_id', userId),
          client
            .from('messages')
            .select('*')
            .eq('thread_id', threadObj.id)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        const otherUser = otherParts && otherParts.length > 0 ? (otherParts[0].profiles as any) : null;
        const lastMsg = lastMsgs && lastMsgs.length > 0 ? lastMsgs[0] : null;

        return {
          id: threadObj.id,
          name: otherUser?.full_name || threadObj.title || 'Chat',
          preview: lastMsg?.content || 'No messages yet',
          time: lastMsg?.created_at
            ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Now',
          avatar: otherUser?.avatar_url || DEFAULT_AVATAR,
          online: true,
          isGroup: threadObj.is_group ?? false,
        } satisfies ThreadPreview;
      }),
    );

    return threadPreviewsList;
  } catch (err) {
    console.error('Error fetching user threads:', err);
    return [];
  }
}
