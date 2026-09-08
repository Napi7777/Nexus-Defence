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
