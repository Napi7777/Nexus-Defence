-- =====================================================================
-- 0008_notifications.sql
-- In-app notification feed + registered push tokens.
-- Covers SRS 3.8 (Push Notifications). Real-time delivery to the app
-- comes from Supabase Realtime on `notifications` (0013_realtime.sql);
-- actual OS-level push (so the phone buzzes when the app is closed)
-- comes from an Edge Function that reads `push_tokens` — see the guide.
-- =====================================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,  -- e.g. {"session_id": "...", "conversation_id": "..."}
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per device the user has granted push permission on.
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  expo_push_token text not null unique,
  device_type text,             -- 'ios' | 'android'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_push_tokens_updated_at
  before update on push_tokens
  for each row execute function set_updated_at();

create index idx_notifications_user on notifications(user_id, created_at desc);
create index idx_notifications_unread on notifications(user_id) where is_read = false;
create index idx_push_tokens_user on push_tokens(user_id);

-- ---------------------------------------------------------------------
-- RLS: notifications
-- Rows are only ever written by trusted server-side code (triggers /
-- edge functions using the service role key), never directly by the
-- client, so there is no client-facing INSERT policy.
-- ---------------------------------------------------------------------
alter table notifications enable row level security;

create policy "a user only sees their own notifications"
  on notifications for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "a user can mark their own notifications read/unread"
  on notifications for update
  to authenticated
  using (user_id = auth.uid());

create policy "a user can clear their own notifications"
  on notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RLS: push_tokens
-- ---------------------------------------------------------------------
alter table push_tokens enable row level security;

create policy "a user manages their own push tokens"
  on push_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Example: auto-notify the sender's conversation partners on new message.
-- (Illustrates the pattern; wire up the equivalent for session reminders
-- and community updates the same way, or from a scheduled Edge Function
-- for time-based reminders.)
-- ---------------------------------------------------------------------
create or replace function notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, type, title, body, data)
  select
    cp.user_id,
    'new_message',
    'New message',
    left(coalesce(new.content, 'Sent an attachment'), 140),
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
  from conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;
  return new;
end;
$$;

create trigger trg_notify_on_new_message
  after insert on messages
  for each row execute function notify_on_new_message();
