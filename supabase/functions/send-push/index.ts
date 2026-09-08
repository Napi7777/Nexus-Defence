// Supabase Edge Function — drains the notification queue to Expo's push service.
//
// Deploy:
//   supabase functions deploy send-push
//
// Schedule it (every minute) with pg_cron in the SQL editor:
//   select cron.schedule('drain-push', '* * * * *', $$
//     select net.http_post(
//       url := '<project-url>/functions/v1/send-push',
//       headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//     );
//   $$);
//
// Uses the service role key: it reads other users' device tokens, which no
// end-user token is allowed to do.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

type QueueRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: queued, error } = await supabase
      .from('notification_queue')
      .select('id, user_id, title, body, data')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!queued?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = queued as QueueRow[];

    // One lookup for every recipient in the batch rather than per row.
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: tokenRows } = await supabase
      .from('device_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    const tokensByUser = new Map<string, string[]>();
    for (const t of tokenRows ?? []) {
      const list = tokensByUser.get(t.user_id) ?? [];
      list.push(t.token);
      tokensByUser.set(t.user_id, list);
    }

    const messages: unknown[] = [];
    const sentIds: string[] = [];
    const skippedIds: string[] = [];

    for (const row of rows) {
      const tokens = tokensByUser.get(row.user_id) ?? [];
      if (!tokens.length) {
        // Nobody to deliver to — resolve it rather than retrying forever.
        skippedIds.push(row.id);
        continue;
      }
      for (const token of tokens) {
        messages.push({
          to: token,
          title: row.title,
          body: row.body,
          data: row.data ?? {},
          sound: 'default',
          channelId: 'default',
        });
      }
      sentIds.push(row.id);
    }

    if (messages.length) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const detail = await response.text();
        await supabase
          .from('notification_queue')
          .update({ status: 'failed', last_error: detail.slice(0, 500) })
          .in('id', sentIds);

        return new Response(JSON.stringify({ error: 'Expo push rejected the batch' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await response.json();

      // Expo returns a ticket per message; a DeviceNotRegistered ticket means
      // the app was uninstalled, so drop the token instead of retrying it.
      const tickets = result?.data ?? [];
      const dead: string[] = [];
      tickets.forEach((ticket: any, i: number) => {
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          const message = messages[i] as { to: string };
          dead.push(message.to);
        }
      });
      if (dead.length) {
        await supabase.from('device_tokens').delete().in('token', dead);
      }
    }

    const resolved = [...sentIds, ...skippedIds];
    if (resolved.length) {
      await supabase
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', resolved);
    }

    return new Response(JSON.stringify({ sent: sentIds.length, skipped: skippedIds.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: 'Could not drain the notification queue.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
