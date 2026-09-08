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
