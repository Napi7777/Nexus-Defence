-- =====================================================================
-- 0001_extensions_and_helpers.sql
-- Learning Commons Mobile App — Supabase schema
-- Extensions, enums, and helper functions used by every later migration.
-- =====================================================================

-- Supabase projects already have pgcrypto/uuid-ossp available, but this
-- makes the migration self-contained if you ever restore it elsewhere.
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;      -- fuzzy/text search (search & discovery)

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type app_role as enum ('learner', 'tutor', 'admin');
create type skill_level as enum ('beginner', 'intermediate', 'advanced', 'expert');
create type community_visibility as enum ('public', 'private');
create type community_member_role as enum ('member', 'moderator', 'owner');
create type session_status as enum ('scheduled', 'live', 'completed', 'cancelled');
create type video_provider as enum ('zoom', 'jitsi', 'google_meet', 'other');
create type rsvp_status as enum ('going', 'interested', 'cancelled');
create type notification_type as enum (
  'session_reminder', 'new_message', 'community_update',
  'new_rating', 'achievement', 'rsvp_update', 'report_update'
);
create type report_target_type as enum ('post', 'comment', 'message', 'session', 'user', 'meetup', 'resource');
create type report_status as enum ('pending', 'reviewed', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------
-- Helper: keep updated_at columns fresh automatically
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Note: is_admin() / is_tutor_or_admin() are defined in 0002, right after
-- the `profiles` table exists — `language sql` functions are validated
-- against the catalog at CREATE FUNCTION time, so they can't be defined
-- here yet.
