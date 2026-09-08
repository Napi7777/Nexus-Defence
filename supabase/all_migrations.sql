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
-- =====================================================================
-- 0002_profiles_skills_interests.sql
-- Profiles (extends auth.users), tag catalog, user skills & interests.
-- Covers SRS 3.1 (Registration & Profile) and half of 3.4 (Recommendations).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- One row per auth.users row. Supabase Auth already handles password
-- hashing, JWT issuance (access + refresh tokens) and session expiry
-- (Authentication -> Settings), so this table only stores app-level
-- profile data — it never stores credentials.
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  bio text,
  role app_role not null default 'learner',
  university text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Helper: is the current JWT holder an admin?
-- Used all over RLS policies instead of repeating a subquery everywhere.
-- SECURITY DEFINER + fixed search_path so it can read profiles regardless
-- of the caller's own row-level permissions.
-- ---------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Helper: is the current user a tutor (or admin)?
-- ---------------------------------------------------------------------
create or replace function is_tutor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('tutor', 'admin')
  );
$$;

-- Auto-create a profile row the moment someone signs up via Supabase Auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'learner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;

create policy "profiles are viewable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins can update any profile (e.g. role, ban status)"
  on profiles for update
  to authenticated
  using (is_admin());

-- RLS alone can't compare NEW.role against OLD.role, so privilege
-- escalation (a learner promoting themselves to tutor/admin, or
-- un-banning themselves) is blocked with a trigger instead.
create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted contexts that bypass this check:
  --  * auth.uid() is null      -> running from the SQL editor, a migration,
  --                               or the service-role key with no user
  --                               impersonation (e.g. bootstrapping the
  --                               first admin — see the guide).
  --  * auth.role() = 'service_role' -> a trusted Edge Function using the
  --                               service key.
  --  * is_admin()              -> an authenticated admin managing users
  --                               through the app itself.
  if auth.uid() is null or auth.role() = 'service_role' or is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only an admin can change a user''s role';
  end if;

  if new.is_banned is distinct from old.is_banned then
    raise exception 'Only an admin can change a user''s ban status';
  end if;

  return new;
end;
$$;

create trigger trg_prevent_profile_privilege_escalation
  before update on profiles
  for each row execute function prevent_profile_privilege_escalation();

-- Row creation is handled solely by the handle_new_user() trigger
-- (security definer), so no INSERT policy is granted to regular users.

-- ---------------------------------------------------------------------
-- tags — shared catalog for interests, community subjects & content
-- categories, so search/filter/recommendation logic has one vocabulary.
-- ---------------------------------------------------------------------
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table tags enable row level security;

create policy "tags are viewable by any authenticated user"
  on tags for select
  to authenticated
  using (true);

create policy "any authenticated user can propose a new tag"
  on tags for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------
-- user_interests (SRS 3.1: interests on a profile)
-- ---------------------------------------------------------------------
create table user_interests (
  user_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

alter table user_interests enable row level security;

create policy "interests are viewable by any authenticated user"
  on user_interests for select
  to authenticated
  using (true);

create policy "users manage their own interests"
  on user_interests for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- user_skills (SRS 3.1: skills + skill level; 3.11: filter by skill level)
-- can_teach lets a "Student Tutor" flag which skills they tutor in,
-- separate from skills they're still learning.
-- ---------------------------------------------------------------------
create table user_skills (
  user_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  level skill_level not null default 'beginner',
  can_teach boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

alter table user_skills enable row level security;

create policy "skills are viewable by any authenticated user"
  on user_skills for select
  to authenticated
  using (true);

create policy "users manage their own skills"
  on user_skills for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_user_interests_tag on user_interests(tag_id);
create index idx_user_skills_tag on user_skills(tag_id);
-- =====================================================================
-- 0003_communities.sql
-- Learning communities + membership.
-- Covers SRS 3.3 (Community Management).
-- =====================================================================

create table communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_image_url text,
  visibility community_visibility not null default 'public',
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_communities_updated_at
  before update on communities
  for each row execute function set_updated_at();

create table community_tags (
  community_id uuid not null references communities(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (community_id, tag_id)
);

create table community_members (
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role community_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index idx_community_members_user on community_members(user_id);
create index idx_community_tags_tag on community_tags(tag_id);

-- Auto-add the creator as owner.
create or replace function handle_new_community()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into community_members (community_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger trg_new_community_owner
  after insert on communities
  for each row execute function handle_new_community();

-- ---------------------------------------------------------------------
-- Helper used repeatedly below: is auth.uid() a member of this community?
-- ---------------------------------------------------------------------
create or replace function is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from community_members
    where community_id = p_community_id and user_id = auth.uid()
  );
$$;

create or replace function community_role(p_community_id uuid)
returns community_member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from community_members
  where community_id = p_community_id and user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- RLS: communities
-- ---------------------------------------------------------------------
alter table communities enable row level security;

create policy "public communities are visible to everyone; private ones to members"
  on communities for select
  to authenticated
  using (
    visibility = 'public'
    or is_community_member(id)
    or created_by = auth.uid()  -- covers the instant of creation, before the
                                 -- AFTER INSERT trigger has added the owner
                                 -- to community_members (matters for `...
                                 -- RETURNING *` on the INSERT)
    or is_admin()
  );

create policy "any authenticated user can create a community (becomes owner)"
  on communities for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "owners/moderators/admins can update a community"
  on communities for update
  to authenticated
  using (community_role(id) in ('owner', 'moderator') or is_admin());

create policy "owners/admins can delete a community"
  on communities for delete
  to authenticated
  using (community_role(id) = 'owner' or is_admin());

-- ---------------------------------------------------------------------
-- RLS: community_tags
-- ---------------------------------------------------------------------
alter table community_tags enable row level security;

create policy "community tags follow community visibility"
  on community_tags for select
  to authenticated
  using (
    exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "owners/moderators manage community tags"
  on community_tags for all
  to authenticated
  using (community_role(community_id) in ('owner', 'moderator') or is_admin())
  with check (community_role(community_id) in ('owner', 'moderator') or is_admin());

-- ---------------------------------------------------------------------
-- RLS: community_members
-- ---------------------------------------------------------------------
alter table community_members enable row level security;

create policy "membership list is visible to other members and on public communities"
  on community_members for select
  to authenticated
  using (
    exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "a user can join a public community themselves"
  on community_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from communities c where c.id = community_id and c.visibility = 'public')
  );

create policy "owners/moderators can add members (e.g. to private communities)"
  on community_members for insert
  to authenticated
  with check (community_role(community_id) in ('owner', 'moderator') or is_admin());

create policy "a user can leave a community themselves"
  on community_members for delete
  to authenticated
  using (user_id = auth.uid());

create policy "owners/moderators can remove members"
  on community_members for delete
  to authenticated
  using (community_role(community_id) in ('owner', 'moderator') or is_admin());

create policy "owners can change member roles (e.g. promote a moderator)"
  on community_members for update
  to authenticated
  using (community_role(community_id) = 'owner' or is_admin());
-- =====================================================================
-- 0004_community_content.sql
-- Posts, discussion comments, and shared resources within a community.
-- Covers SRS 3.3 (Posts / Discussions / Shared resources) and half of
-- 3.7 (group discussions/forums, file & link sharing).
-- =====================================================================

create table community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_community_posts_updated_at
  before update on community_posts
  for each row execute function set_updated_at();

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table shared_resources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  file_url text,          -- points into the "resources" storage bucket, or an external link
  file_type text,          -- e.g. 'pdf', 'link', 'image', 'doc'
  created_at timestamptz not null default now()
);

create index idx_community_posts_community on community_posts(community_id, created_at desc);
create index idx_post_comments_post on post_comments(post_id, created_at);
create index idx_shared_resources_community on shared_resources(community_id, created_at desc);

-- ---------------------------------------------------------------------
-- RLS: community_posts
-- ---------------------------------------------------------------------
alter table community_posts enable row level security;

create policy "posts are visible to community members (or anyone on public communities)"
  on community_posts for select
  to authenticated
  using (
    exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "members can post in their community"
  on community_posts for insert
  to authenticated
  with check (author_id = auth.uid() and is_community_member(community_id));

create policy "authors, moderators, owners and admins can edit/delete posts"
  on community_posts for update
  to authenticated
  using (author_id = auth.uid() or community_role(community_id) in ('owner', 'moderator') or is_admin());

create policy "authors, moderators, owners and admins can delete posts"
  on community_posts for delete
  to authenticated
  using (author_id = auth.uid() or community_role(community_id) in ('owner', 'moderator') or is_admin());

-- ---------------------------------------------------------------------
-- RLS: post_comments
-- ---------------------------------------------------------------------
alter table post_comments enable row level security;

create policy "comments are visible wherever the parent post is visible"
  on post_comments for select
  to authenticated
  using (
    exists (
      select 1 from community_posts p
      join communities c on c.id = p.community_id
      where p.id = post_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "members can comment on posts in their community"
  on post_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from community_posts p
      where p.id = post_id and is_community_member(p.community_id)
    )
  );

create policy "authors and moderators can delete comments"
  on post_comments for delete
  to authenticated
  using (
    author_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from community_posts p
      where p.id = post_id and community_role(p.community_id) in ('owner', 'moderator')
    )
  );

-- ---------------------------------------------------------------------
-- RLS: shared_resources
-- ---------------------------------------------------------------------
alter table shared_resources enable row level security;

create policy "resources are visible wherever the community is visible"
  on shared_resources for select
  to authenticated
  using (
    exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "members can share resources in their community"
  on shared_resources for insert
  to authenticated
  with check (uploaded_by = auth.uid() and is_community_member(community_id));

create policy "uploader, moderators, owners and admins can remove resources"
  on shared_resources for delete
  to authenticated
  using (uploaded_by = auth.uid() or community_role(community_id) in ('owner', 'moderator') or is_admin());
-- =====================================================================
-- 0005_sessions_and_content.sql
-- Live tutoring sessions (video-call based) and recorded content.
-- Covers SRS 3.5 (Learning Sessions: Live + Recorded Content).
-- =====================================================================

create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  tutor_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  video_provider video_provider not null default 'zoom',
  meeting_url text,          -- filled in once the video-call meeting is created
  meeting_external_id text,  -- e.g. the Zoom meeting ID, set by the edge function below
  status session_status not null default 'scheduled',
  max_participants integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_session_time check (scheduled_end > scheduled_start)
);

create trigger trg_live_sessions_updated_at
  before update on live_sessions
  for each row execute function set_updated_at();

create table session_participants (
  session_id uuid not null references live_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  attended boolean not null default false,
  primary key (session_id, user_id)
);

-- ---------------------------------------------------------------------
-- Recorded content: uploaded videos, streamed or downloaded later.
-- ---------------------------------------------------------------------
create table recorded_content (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete set null,
  tutor_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,   -- points into the "recordings" storage bucket, or an external host
  thumbnail_url text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create table content_tags (
  content_id uuid not null references recorded_content(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (content_id, tag_id)
);

create table content_views (
  content_id uuid not null references recorded_content(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (content_id, user_id)
);

create index idx_live_sessions_tutor on live_sessions(tutor_id);
create index idx_live_sessions_community on live_sessions(community_id);
create index idx_live_sessions_schedule on live_sessions(scheduled_start);
create index idx_session_participants_user on session_participants(user_id);
create index idx_recorded_content_community on recorded_content(community_id);
create index idx_recorded_content_tutor on recorded_content(tutor_id);
create index idx_content_tags_tag on content_tags(tag_id);

-- ---------------------------------------------------------------------
-- RLS: live_sessions
-- Visible if it's a standalone session, or belongs to a public community,
-- or the viewer is a member of that community.
-- ---------------------------------------------------------------------
alter table live_sessions enable row level security;

create policy "sessions are visible per community visibility (or standalone = everyone)"
  on live_sessions for select
  to authenticated
  using (
    community_id is null
    or exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "tutors/admins can schedule a session"
  on live_sessions for insert
  to authenticated
  with check (tutor_id = auth.uid() and is_tutor_or_admin());

create policy "the tutor who owns the session (or an admin) can update/cancel it"
  on live_sessions for update
  to authenticated
  using (tutor_id = auth.uid() or is_admin());

create policy "the tutor who owns the session (or an admin) can delete it"
  on live_sessions for delete
  to authenticated
  using (tutor_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- RLS: session_participants
-- ---------------------------------------------------------------------
alter table session_participants enable row level security;

create policy "the tutor sees their session's roster; users see their own registration"
  on session_participants for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from live_sessions s where s.id = session_id and s.tutor_id = auth.uid())
  );

create policy "a user can register themselves for a session"
  on session_participants for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "a user can cancel their own registration"
  on session_participants for delete
  to authenticated
  using (user_id = auth.uid());

create policy "the tutor can mark attendance for their own session"
  on session_participants for update
  to authenticated
  using (exists (select 1 from live_sessions s where s.id = session_id and s.tutor_id = auth.uid()) or is_admin());

-- ---------------------------------------------------------------------
-- RLS: recorded_content / content_tags / content_views
-- ---------------------------------------------------------------------
alter table recorded_content enable row level security;

create policy "recorded content is visible per community visibility (or standalone = everyone)"
  on recorded_content for select
  to authenticated
  using (
    community_id is null
    or exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "tutors/admins can upload recorded content"
  on recorded_content for insert
  to authenticated
  with check (tutor_id = auth.uid() and is_tutor_or_admin());

create policy "the owning tutor or an admin can edit/delete recorded content"
  on recorded_content for update
  to authenticated
  using (tutor_id = auth.uid() or is_admin());

create policy "the owning tutor or an admin can delete recorded content"
  on recorded_content for delete
  to authenticated
  using (tutor_id = auth.uid() or is_admin());

alter table content_tags enable row level security;

create policy "content tags are visible wherever the content is visible"
  on content_tags for select
  to authenticated
  using (true);

create policy "the owning tutor manages their content's tags"
  on content_tags for all
  to authenticated
  using (exists (select 1 from recorded_content rc where rc.id = content_id and rc.tutor_id = auth.uid()) or is_admin())
  with check (exists (select 1 from recorded_content rc where rc.id = content_id and rc.tutor_id = auth.uid()) or is_admin());

alter table content_views enable row level security;

create policy "a user can log/view their own viewing history; tutors see viewers of their content"
  on content_views for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from recorded_content rc where rc.id = content_id and rc.tutor_id = auth.uid())
  );

create policy "a user logs their own view (for progress tracking)"
  on content_views for insert
  to authenticated
  with check (user_id = auth.uid());
-- =====================================================================
-- 0006_meetups.sql
-- In-person meetups with location + RSVP.
-- Covers SRS 3.6 (In-Person Meetup Feature).
-- =====================================================================

create table meetups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  tutor_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  meetup_at timestamptz not null,
  location_name text not null,
  -- latitude/longitude as plain numerics keep this schema dependency-free;
  -- switch to the PostGIS `geography(Point)` type later if you need
  -- radius/"near me" queries — see the guide's "Scaling up" section.
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_meetups_updated_at
  before update on meetups
  for each row execute function set_updated_at();

create table meetup_rsvps (
  meetup_id uuid not null references meetups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status rsvp_status not null default 'going',
  rsvp_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

create index idx_meetups_community on meetups(community_id);
create index idx_meetups_time on meetups(meetup_at);
create index idx_meetup_rsvps_user on meetup_rsvps(user_id);

-- ---------------------------------------------------------------------
-- RLS: meetups
-- ---------------------------------------------------------------------
alter table meetups enable row level security;

create policy "meetups are visible per community visibility (or standalone = everyone)"
  on meetups for select
  to authenticated
  using (
    community_id is null
    or exists (
      select 1 from communities c
      where c.id = community_id
        and (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    )
  );

create policy "tutors/admins can create a meetup"
  on meetups for insert
  to authenticated
  with check (tutor_id = auth.uid() and is_tutor_or_admin());

create policy "the organizing tutor or an admin can update/cancel a meetup"
  on meetups for update
  to authenticated
  using (tutor_id = auth.uid() or is_admin());

create policy "the organizing tutor or an admin can delete a meetup"
  on meetups for delete
  to authenticated
  using (tutor_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- RLS: meetup_rsvps
-- ---------------------------------------------------------------------
alter table meetup_rsvps enable row level security;

create policy "the organizer sees the guest list; users see their own RSVP"
  on meetup_rsvps for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from meetups m where m.id = meetup_id and m.tutor_id = auth.uid())
  );

create policy "a user can RSVP themselves"
  on meetup_rsvps for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "a user can change/cancel their own RSVP"
  on meetup_rsvps for update
  to authenticated
  using (user_id = auth.uid());

create policy "a user can withdraw their own RSVP"
  on meetup_rsvps for delete
  to authenticated
  using (user_id = auth.uid());
-- =====================================================================
-- 0007_messaging.sql
-- Real-time chat: 1:1 private messages, group chats, community discussions.
-- Covers SRS 3.7 (Communication System) — real-time delivery comes from
-- enabling Supabase Realtime on `messages` (see 0013_realtime.sql).
-- =====================================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,                      -- used for group chats; null for 1:1
  community_id uuid references communities(id) on delete cascade, -- set for a community's group discussion, null for ad-hoc chats
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text,
  attachment_url text,          -- file/link sharing within chat
  created_at timestamptz not null default now(),
  constraint chk_message_has_body check (content is not null or attachment_url is not null)
);

create index idx_conversation_participants_user on conversation_participants(user_id);
create index idx_messages_conversation on messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Helper: is auth.uid() a participant in this conversation?
-- ---------------------------------------------------------------------
create or replace function is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

-- Auto-add the creator as a participant.
create or replace function handle_new_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into conversation_participants (conversation_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_new_conversation_participant
  after insert on conversations
  for each row execute function handle_new_conversation();

-- ---------------------------------------------------------------------
-- RLS: conversations
-- ---------------------------------------------------------------------
alter table conversations enable row level security;

create policy "only participants can see a conversation"
  on conversations for select
  to authenticated
  using (
    is_conversation_participant(id)
    or created_by = auth.uid()  -- covers the instant of creation, before the
                                 -- AFTER INSERT trigger has added the creator
                                 -- to conversation_participants (matters for
                                 -- `... RETURNING *` on the INSERT)
    or is_admin()
  );

create policy "any authenticated user can start a conversation"
  on conversations for insert
  to authenticated
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------
-- RLS: conversation_participants
-- ---------------------------------------------------------------------
alter table conversation_participants enable row level security;

create policy "only participants can see the participant list"
  on conversation_participants for select
  to authenticated
  using (is_conversation_participant(conversation_id) or is_admin());

create policy "an existing participant can add others (group chats) or join themselves"
  on conversation_participants for insert
  to authenticated
  with check (user_id = auth.uid() or is_conversation_participant(conversation_id));

create policy "a participant can update their own read receipt"
  on conversation_participants for update
  to authenticated
  using (user_id = auth.uid());

create policy "a participant can leave a conversation"
  on conversation_participants for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RLS: messages
-- ---------------------------------------------------------------------
alter table messages enable row level security;

create policy "only participants can read messages"
  on messages for select
  to authenticated
  using (is_conversation_participant(conversation_id) or is_admin());

create policy "only participants can send messages"
  on messages for insert
  to authenticated
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id));

create policy "a sender can delete their own message"
  on messages for delete
  to authenticated
  using (sender_id = auth.uid() or is_admin());
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
-- =====================================================================
-- 0009_progress_gamification.sql
-- Progress tracking, points ledger, ratings/reviews, leaderboard.
-- Covers SRS 3.9 (Progress Tracking) and 3.10 (Gamification System).
-- =====================================================================

-- ---------------------------------------------------------------------
-- learning_activity_log — a single append-only ledger that both
-- progress tracking AND gamification read from. Every point-earning
-- action (attending a session, posting, RSVPing) writes one row here;
-- nothing updates a row after the fact, so history stays trustworthy.
-- ---------------------------------------------------------------------
create table learning_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null,     -- e.g. 'session_attended', 'discussion_post', 'meetup_attended'
  reference_table text,            -- e.g. 'live_sessions', 'community_posts'
  reference_id uuid,
  points_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_activity_log_user on learning_activity_log(user_id, created_at desc);

alter table learning_activity_log enable row level security;

create policy "a user sees their own activity; tutors/admins see the full log"
  on learning_activity_log for select
  to authenticated
  using (user_id = auth.uid() or is_tutor_or_admin());

-- Rows are written only by trusted triggers/edge functions (service
-- role), never directly by the client — no client-facing INSERT policy.

-- ---------------------------------------------------------------------
-- ratings_reviews (tutors receive ratings and reviews)
-- ---------------------------------------------------------------------
create table ratings_reviews (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references profiles(id) on delete cascade,
  rated_by uuid not null references profiles(id) on delete cascade,
  session_id uuid references live_sessions(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  unique (tutor_id, rated_by, session_id),
  constraint chk_not_self_review check (tutor_id <> rated_by)
);

create index idx_ratings_tutor on ratings_reviews(tutor_id);

alter table ratings_reviews enable row level security;

create policy "ratings are publicly visible to authenticated users"
  on ratings_reviews for select
  to authenticated
  using (true);

create policy "a user can leave a rating for a tutor"
  on ratings_reviews for insert
  to authenticated
  with check (rated_by = auth.uid());

create policy "a user can edit/delete their own rating"
  on ratings_reviews for update
  to authenticated
  using (rated_by = auth.uid());

create policy "a user or admin can delete a rating"
  on ratings_reviews for delete
  to authenticated
  using (rated_by = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- Views: leaderboard + per-user progress summary.
-- Computed on read (no drift risk); add a materialized view later if
-- this needs to scale past a few thousand active users (see the guide).
-- ---------------------------------------------------------------------
create view leaderboard as
select
  p.id as user_id,
  p.full_name,
  p.avatar_url,
  coalesce(sum(l.points_earned), 0) as total_points,
  rank() over (order by coalesce(sum(l.points_earned), 0) desc) as rank
from profiles p
left join learning_activity_log l on l.user_id = p.id
group by p.id, p.full_name, p.avatar_url
order by total_points desc;

create view user_progress_summary as
select
  p.id as user_id,
  count(*) filter (where sp.attended) as sessions_attended,
  count(distinct mr.meetup_id) filter (where mr.status = 'going') as meetups_attending,
  coalesce(sum(l.points_earned), 0) as total_points,
  count(*) filter (where l.activity_type = 'discussion_post') as posts_made
from profiles p
left join session_participants sp on sp.user_id = p.id
left join meetup_rsvps mr on mr.user_id = p.id
left join learning_activity_log l on l.user_id = p.id
group by p.id;

-- ---------------------------------------------------------------------
-- Example trigger: award points + log activity when attendance is
-- marked true on a live session (tutor marks the roster — see 0005).
-- Follow this pattern for other point-earning events.
-- ---------------------------------------------------------------------
create or replace function award_points_on_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attended = true and (old.attended is distinct from new.attended) then
    insert into learning_activity_log (user_id, activity_type, reference_table, reference_id, points_earned)
    values (new.user_id, 'session_attended', 'live_sessions', new.session_id, 10);
  end if;
  return new;
end;
$$;

create trigger trg_award_points_on_attendance
  after update on session_participants
  for each row execute function award_points_on_attendance();

create or replace function award_points_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into learning_activity_log (user_id, activity_type, reference_table, reference_id, points_earned)
  values (new.author_id, 'discussion_post', 'community_posts', new.id, 2);
  return new;
end;
$$;

create trigger trg_award_points_on_post
  after insert on community_posts
  for each row execute function award_points_on_post();
-- =====================================================================
-- 0010_admin_reports.sql
-- Content moderation: user reports + the actions admins take on them.
-- Covers SRS 3.12 (Admin Features) and part of 3.2 (restrict unauthorized
-- users — see is_banned on profiles, enforced in the app's auth guard).
-- =====================================================================

create table reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references profiles(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,          -- polymorphic reference (post/comment/message/session/user/meetup/resource)
  reason text not null,
  status report_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete set null,
  admin_id uuid not null references profiles(id) on delete cascade,
  action_type text not null,        -- e.g. 'content_removed', 'user_banned', 'warning_issued', 'dismissed'
  target_type report_target_type,
  target_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_reports_status on reports(status);
create index idx_reports_target on reports(target_type, target_id);
create index idx_moderation_actions_admin on moderation_actions(admin_id);

-- ---------------------------------------------------------------------
-- RLS: reports
-- ---------------------------------------------------------------------
alter table reports enable row level security;

create policy "a user can see their own submitted reports; admins see all"
  on reports for select
  to authenticated
  using (reported_by = auth.uid() or is_admin());

create policy "any authenticated user can file a report"
  on reports for insert
  to authenticated
  with check (reported_by = auth.uid());

create policy "only admins can update a report's status/resolution"
  on reports for update
  to authenticated
  using (is_admin());

-- ---------------------------------------------------------------------
-- RLS: moderation_actions — admin-only, full stop.
-- ---------------------------------------------------------------------
alter table moderation_actions enable row level security;

create policy "only admins can view the moderation log"
  on moderation_actions for select
  to authenticated
  using (is_admin());

create policy "only admins can record a moderation action"
  on moderation_actions for insert
  to authenticated
  with check (is_admin() and admin_id = auth.uid());
-- =====================================================================
-- 0011_search_and_recommendations.sql
-- Full-text search indexes + SQL-based recommendation functions.
-- Covers SRS 3.11 (Search & Discovery) and 3.4 (Intelligent
-- Recommendation System). No external ML service required: this uses
-- Postgres full-text search (search) and simple tag-overlap scoring
-- (recommendations), which is more than enough for launch — see the
-- guide for how to swap in something fancier later without changing
-- the app's API surface.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Full-text search columns (generated, always in sync automatically)
-- ---------------------------------------------------------------------
alter table communities
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

alter table profiles
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A')
  ) stored;

alter table recorded_content
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index idx_communities_search on communities using gin (search_vector);
create index idx_profiles_search on profiles using gin (search_vector);
create index idx_recorded_content_search on recorded_content using gin (search_vector);

-- Trigram indexes power fast "contains"/fuzzy matching for autocomplete-
-- style search boxes (ILIKE '%term%'), which tsvector alone doesn't do well.
create index idx_communities_name_trgm on communities using gin (name gin_trgm_ops);
create index idx_tags_name_trgm on tags using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- search_communities(term, subject_tag, min_skill_level)
-- Backs SRS 3.11: search for communities/tutors/courses with filters
-- for subject and skill level.
-- ---------------------------------------------------------------------
create or replace function search_communities(
  p_term text default null,
  p_tag_id uuid default null
)
returns setof communities
language sql
stable
security definer
set search_path = public
as $$
  select distinct c.*
  from communities c
  left join community_tags ct on ct.community_id = c.id
  where (c.visibility = 'public' or is_community_member(c.id) or is_admin())
    and (p_term is null or c.search_vector @@ plainto_tsquery('english', p_term) or c.name ilike '%' || p_term || '%')
    and (p_tag_id is null or ct.tag_id = p_tag_id)
  order by c.created_at desc;
$$;

create or replace function search_tutors(
  p_term text default null,
  p_tag_id uuid default null,
  p_min_level skill_level default null
)
returns setof profiles
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.*
  from profiles p
  left join user_skills us on us.user_id = p.id and us.can_teach = true
  where p.role = 'tutor'
    and (p_term is null or p.search_vector @@ plainto_tsquery('english', p_term) or p.full_name ilike '%' || p_term || '%')
    and (p_tag_id is null or us.tag_id = p_tag_id)
    and (
      p_min_level is null
      or us.level in (
        select unnest(enum_range(p_min_level, null::skill_level))
      )
    )
  order by p.full_name;
$$;

-- ---------------------------------------------------------------------
-- get_recommended_communities(user_id, limit)
-- Scores communities by shared tags with the user's interests/skills,
-- then by popularity (member_count) as a tiebreaker for cold-start
-- users with no interests set yet.
-- ---------------------------------------------------------------------
create or replace function get_recommended_communities(
  p_user_id uuid,
  p_limit integer default 10
)
returns table (community_id uuid, name text, score integer)
language sql
stable
security definer
set search_path = public
as $$
  with my_tags as (
    select tag_id from user_interests where user_id = p_user_id
    union
    select tag_id from user_skills where user_id = p_user_id
  ),
  scored as (
    select
      c.id as community_id,
      c.name,
      count(distinct ct.tag_id) filter (where ct.tag_id in (select tag_id from my_tags)) as tag_matches,
      (select count(*) from community_members cm where cm.community_id = c.id) as member_count
    from communities c
    left join community_tags ct on ct.community_id = c.id
    where c.visibility = 'public'
      and c.id not in (select community_id from community_members where user_id = p_user_id)
    group by c.id, c.name
  )
  select community_id, name, (tag_matches * 10 + least(member_count, 50))::integer as score
  from scored
  order by score desc, member_count desc
  limit p_limit;
$$;

create or replace function get_recommended_tutors(
  p_user_id uuid,
  p_limit integer default 10
)
returns table (tutor_id uuid, full_name text, score integer)
language sql
stable
security definer
set search_path = public
as $$
  with my_tags as (
    select tag_id from user_interests where user_id = p_user_id
    union
    select tag_id from user_skills where user_id = p_user_id
  )
  select
    p.id as tutor_id,
    p.full_name,
    (
      count(distinct us.tag_id) filter (where us.tag_id in (select tag_id from my_tags)) * 10
      + coalesce((select round(avg(rr.rating))::integer from ratings_reviews rr where rr.tutor_id = p.id), 0)
    )::integer as score
  from profiles p
  join user_skills us on us.user_id = p.id and us.can_teach = true
  where p.role = 'tutor'
  group by p.id, p.full_name
  order by score desc
  limit p_limit;
$$;

create or replace function get_recommended_sessions(
  p_user_id uuid,
  p_limit integer default 10
)
returns setof live_sessions
language sql
stable
security definer
set search_path = public
as $$
  with my_tags as (
    select tag_id from user_interests where user_id = p_user_id
    union
    select tag_id from user_skills where user_id = p_user_id
  )
  select distinct s.*
  from live_sessions s
  left join community_tags ct on ct.community_id = s.community_id
  where s.status = 'scheduled'
    and s.scheduled_start > now()
    and (
      s.community_id is null
      or ct.tag_id in (select tag_id from my_tags)
      or is_community_member(s.community_id)
    )
  order by s.scheduled_start
  limit p_limit;
$$;
-- =====================================================================
-- 0012_storage_buckets.sql
-- Storage buckets + RLS policies on storage.objects.
-- Run this AFTER everything above (it references profiles/communities).
-- Bucket path convention used throughout: the first path segment is
-- always the owning user's or community's UUID, e.g.
--   avatars/<user_id>/profile.jpg
--   community-covers/<community_id>/cover.jpg
--   resources/<community_id>/<filename>
--   chat-attachments/<conversation_id>/<filename>
--   recordings/<tutor_id>/<filename>
-- storage.foldername(name) splits that path into an array so policies
-- can check ownership from the object's own path.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('community-covers', 'community-covers', true),
  ('resources', 'resources', false),
  ('chat-attachments', 'chat-attachments', false),
  ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- avatars — public read, owner can write their own folder
-- ---------------------------------------------------------------------
create policy "avatar images are publicly readable"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "a user can upload/replace their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "a user can update/delete their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "a user can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- community-covers — public read, owner/moderator of the community can write
-- ---------------------------------------------------------------------
create policy "community cover images are publicly readable"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'community-covers');

create policy "owners/moderators can upload a community cover image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-covers'
    and community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
  );

create policy "owners/moderators can replace/remove a community cover image"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-covers'
    and community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
  );

create policy "owners/moderators can delete a community cover image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-covers'
    and community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
  );

-- ---------------------------------------------------------------------
-- resources — private, readable by community members, writable by members
-- ---------------------------------------------------------------------
create policy "community members can read shared resource files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resources'
    and is_community_member(((storage.foldername(name))[1])::uuid)
  );

create policy "community members can upload resource files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and is_community_member(((storage.foldername(name))[1])::uuid)
  );

create policy "uploader or moderators can delete a resource file"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resources'
    and (
      owner = auth.uid()
      or community_role(((storage.foldername(name))[1])::uuid) in ('owner', 'moderator')
    )
  );

-- ---------------------------------------------------------------------
-- chat-attachments — private, readable/writable only by conversation participants
-- ---------------------------------------------------------------------
create policy "conversation participants can read chat attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "conversation participants can upload chat attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------
-- recordings — private-ish; readable by anyone with community access,
-- writable only by the tutor who owns that folder.
-- NOTE: Supabase Storage has per-file size limits (see project Storage
-- settings) and is fine for short clips, but for long lecture videos at
-- scale, prefer an external video host (Mux, YouTube unlisted, Cloudflare
-- Stream) and store only the resulting URL in recorded_content.video_url.
-- ---------------------------------------------------------------------
create policy "recordings are readable by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'recordings');

create policy "a tutor can upload recordings to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
    and is_tutor_or_admin()
  );

create policy "a tutor can delete their own recordings"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
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
