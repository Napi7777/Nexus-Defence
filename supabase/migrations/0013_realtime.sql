-- =====================================================================
-- 0013_realtime.sql
-- Turn on Supabase Realtime (Postgres change streaming) for the tables
-- the app needs to update live in the UI. Every Supabase project already
-- has an empty `supabase_realtime` publication — this just adds tables
-- to it. Safe to re-run; ADD TABLE is idempotent-ish via the guard below.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table community_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'post_comments'
  ) then
    alter publication supabase_realtime add table post_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'session_participants'
  ) then
    alter publication supabase_realtime add table session_participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_sessions'
  ) then
    alter publication supabase_realtime add table live_sessions;
  end if;
end $$;

-- Also set REPLICA IDENTITY FULL on messages so DELETE events carry the
-- full old row (useful if the app wants to remove a deleted message from
-- the chat UI in realtime instead of just seeing its id disappear).
alter table messages replica identity full;
