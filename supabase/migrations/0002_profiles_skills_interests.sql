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
