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
