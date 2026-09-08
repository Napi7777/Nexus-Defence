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
