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
