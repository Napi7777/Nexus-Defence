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
