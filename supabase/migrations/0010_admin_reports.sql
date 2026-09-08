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
