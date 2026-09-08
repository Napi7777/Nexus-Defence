/**
 * In-app notification center (SRS 3.8 — "Users must receive notifications
 * for: Upcoming sessions, Messages, Community updates. Notifications must be
 * real-time.").
 *
 * `notification_queue` (supabase_migration_03_phase3.sql, extended by
 * supabase_migration_04_phase4.sql) is populated server-side: DB triggers
 * insert a row on a new message (`data.type = 'message'`) and a new
 * community post (`data.type = 'post'`), and `queue_upcoming_reminders()`
 * inserts rows ahead of a session (`data.type = 'session_reminder'`) or
 * meetup (`data.type = 'meetup_reminder'`) starting. This file only reads
 * that queue and adapts it for the UI — it never writes rows into it.
 *
 * Read/unread tracking is intentionally NOT round-tripped to the row itself:
 * the table's only RLS policy is "Users read own notifications" (SELECT,
 * auth.uid() = user_id) — there is no UPDATE policy, so a client UPDATE
 * would be silently dropped (0 rows affected, no error). The table also has
 * no `is_read` column; its `status` column ('pending' / 'sent' / 'failed')
 * belongs entirely to the send-push Edge Function's delivery pipeline
 * (supabase/functions/send-push/index.ts) and must not be repurposed here.
 * So "read" state for this in-app list lives on-device, the same pattern
 * already used for e.g. reviewed sessions in src/lib/storage.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from './client';

const READ_STATE_KEY = '@nexus_notifications_read_state';
/** Caps the explicit-id list so it can't grow forever between "mark all read" calls. */
const MAX_TRACKED_READ_IDS = 300;

type ReadState = {
  /** Everything created at or before this ISO timestamp counts as read. */
  readBefore: string;
  /** Ids read individually that arrived after `readBefore`. */
  readIds: string[];
};

const EMPTY_READ_STATE: ReadState = { readBefore: '', readIds: [] };

async function loadReadState(): Promise<ReadState> {
  try {
    const raw = await AsyncStorage.getItem(READ_STATE_KEY);
    if (!raw) return EMPTY_READ_STATE;
    const parsed = JSON.parse(raw);
    return {
      readBefore: typeof parsed?.readBefore === 'string' ? parsed.readBefore : '',
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
    };
  } catch (err) {
    console.warn('Error loading notification read state:', err);
    return EMPTY_READ_STATE;
  }
}

async function saveReadState(state: ReadState): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Error saving notification read state:', err);
  }
}

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
};

/** The signed-in user's notifications, most recent first. */
export async function getNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const client = getSupabaseClient();
  if (!client || !userId) return [];
  try {
    // Primary query against notifications (backend migration 0008)
    let res = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    let rows: any[] = res.data ?? [];

    if ((!rows || rows.length === 0) && res.error) {
      // Fallback to legacy notification_queue
      const fallbackRes = await client
        .from('notification_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      rows = fallbackRes.data ?? [];
    }

    if (!rows) return [];

    const { readBefore, readIds } = await loadReadState();

    return rows.map((row: any) => {
      const serverRead = typeof row.is_read === 'boolean' ? row.is_read : false;
      const clientRead = readIds.includes(row.id) || (!!readBefore && row.created_at <= readBefore);
      return {
        id: row.id,
        title: row.title || '',
        body: row.body || '',
        data: row.data ?? null,
        isRead: serverRead || clientRead,
        createdAt: row.created_at,
      };
    });
  } catch (err) {
    console.warn('Error fetching notifications:', err);
    return [];
  }
}

/** Marks one notification read (in Supabase 0008 RLS and on-device). */
export async function markNotificationRead(id: string): Promise<{ error: Error | null }> {
  if (!id) return { error: null };
  const client = getSupabaseClient();
  if (client) {
    client.from('notifications').update({ is_read: true }).eq('id', id).then(() => {}).catch(() => {});
  }
  try {
    const state = await loadReadState();
    if (!state.readIds.includes(id)) {
      state.readIds = [...state.readIds, id].slice(-MAX_TRACKED_READ_IDS);
      await saveReadState(state);
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Marks everything up to now read (in Supabase 0008 RLS and on-device).
 */
export async function markAllNotificationsRead(userId: string): Promise<{ error: Error | null }> {
  const client = getSupabaseClient();
  if (client && userId) {
    client.from('notifications').update({ is_read: true }).eq('user_id', userId).then(() => {}).catch(() => {});
  }
  try {
    await saveReadState({ readBefore: new Date().toISOString(), readIds: [] });
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Just the count of unread notifications — what the header bell's badge shows.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const rows = await getNotifications(userId, 200);
  return rows.filter((n) => !n.isRead).length;
}

/**
 * Live updates for the signed-in user's notifications.
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (n: AppNotification) => void
) {
  const client = getSupabaseClient();
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`public:notifications:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        const row = payload.new;
        onNew({
          id: row.id || `notif-${Date.now()}`,
          title: row.title || '',
          body: row.body || '',
          data: row.data ?? null,
          isRead: false,
          createdAt: row.created_at || new Date().toISOString(),
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_queue',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        const row = payload.new;
        onNew({
          id: row.id || `notif-${Date.now()}`,
          title: row.title || '',
          body: row.body || '',
          data: row.data ?? null,
          isRead: false,
          createdAt: row.created_at || new Date().toISOString(),
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
