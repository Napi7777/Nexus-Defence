-- ============================================================================
-- Learning Commons — Migration 02 (Phase 1: "Make the data real")
--
-- Run AFTER supabase_learning_commons_schema.sql, in the Supabase SQL editor.
-- Safe to re-run: every statement is idempotent.
--
-- Covers:
--   A. Profile fields the SRS requires but the schema lacks (interests, skill level)
--   B. Tables for content that is currently held in React state and lost on unmount
--   C. Tables for progress tracking, gamification and moderation (SRS 3.9/3.10/3.12)
--   D. Push device tokens (SRS 3.8)
--   E. Storage buckets for avatars, resources and recordings
--   F. Security fixes to the existing policies — including a private-message leak
-- ============================================================================


-- ============================================================================
-- A. PROFILE COMPLETENESS  (SRS 3.1: name, interests, skills, skill level)
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS skill_level TEXT
        CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced'))
        DEFAULT 'Beginner',
    -- Used by the moderation queue in SRS 3.12. Kept separate from `role`
    -- (Student/Tutor) because being a tutor is not an administrative power.
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;


-- ============================================================================
-- B. COMMUNITY CONTENT  (SRS 3.3: posts, discussions, shared resources)
-- ============================================================================

-- 11. COMMUNITY POSTS
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_community_created_idx
    ON public.posts (community_id, created_at DESC);

-- 12. POST COMMENTS (the "discussions" half of SRS 3.3)
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS post_comments_post_created_idx
    ON public.post_comments (post_id, created_at);

-- 13. SHARED RESOURCES (files and links attached to a community)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    kind TEXT CHECK (kind IN ('file', 'link')) DEFAULT 'file',
    -- Storage object path for kind='file', or the URL for kind='link'.
    url TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS resources_community_idx
    ON public.resources (community_id, created_at DESC);


-- ============================================================================
-- C. PROGRESS, GAMIFICATION, MODERATION  (SRS 3.9, 3.10, 3.12)
-- ============================================================================

-- 14. SESSION ATTENDANCE — the source of truth for progress tracking.
CREATE TABLE IF NOT EXISTS public.session_attendance (
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    minutes_attended INTEGER DEFAULT 0,
    PRIMARY KEY (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS session_attendance_user_idx
    ON public.session_attendance (user_id, joined_at DESC);

-- 15. POINTS LEDGER — append-only, so a total can always be recomputed and
--     audited rather than trusting a mutable counter on profiles.
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN (
        'session_attended', 'post_created', 'comment_created',
        'resource_shared', 'daily_task', 'meetup_attended'
    )),
    ref_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS points_ledger_user_idx
    ON public.points_ledger (user_id, created_at DESC);

-- Leaderboard reads this instead of the mock array in the app.
--
-- Aggregated with scalar subqueries, NOT two LEFT JOINs: joining both
-- points_ledger and session_attendance produces a cartesian product, and
-- SUM(points) would then be multiplied by the number of sessions attended.
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    COALESCE((
        SELECT SUM(l.points) FROM public.points_ledger l WHERE l.user_id = p.id
    ), 0)::INTEGER AS total_points,
    COALESCE((
        SELECT COUNT(*) FROM public.session_attendance a WHERE a.user_id = p.id
    ), 0)::INTEGER AS sessions_attended
FROM public.profiles p
ORDER BY total_points DESC;

-- 16. TUTOR RATINGS & REVIEWS (SRS 3.10)
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- One review per rater per tutor; re-rating updates the existing row.
    UNIQUE (tutor_id, rater_id)
);

-- 17. MODERATION REPORTS (SRS 3.12)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'message', 'profile', 'community')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'open',
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);


-- ============================================================================
-- D. PUSH DELIVERY  (SRS 3.8 — the token is currently logged and discarded)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.device_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens (user_id);


-- ============================================================================
-- E. STORAGE BUCKETS  (avatars, community resources, recorded sessions)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('avatars',    'avatars',    TRUE,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
    ('resources',  'resources',  FALSE, 52428800,  NULL),
    ('recordings', 'recordings', FALSE, 524288000, ARRAY['video/mp4','video/quicktime','video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Avatars: world-readable, but each user may only write inside a folder named
-- after their own uid.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users manage their own avatar" ON storage.objects;
CREATE POLICY "Users manage their own avatar" ON storage.objects
    FOR ALL USING (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT
    ) WITH CHECK (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Resources and recordings: any signed-in user may read; only the uploader may
-- write to their own folder.
DROP POLICY IF EXISTS "Signed-in users read shared files" ON storage.objects;
CREATE POLICY "Signed-in users read shared files" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('resources', 'recordings') AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Uploaders manage their own files" ON storage.objects;
CREATE POLICY "Uploaders manage their own files" ON storage.objects
    FOR ALL USING (
        bucket_id IN ('resources', 'recordings')
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    ) WITH CHECK (
        bucket_id IN ('resources', 'recordings')
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );


-- ============================================================================
-- F. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens      ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller an admin? SECURITY DEFINER so the policy can read
-- profiles without recursing through profiles' own RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

-- Posts: readable by any signed-in user; authors edit and delete their own;
-- admins may delete anything (SRS 3.12 "remove inappropriate content").
DROP POLICY IF EXISTS "Posts readable by signed-in users" ON public.posts;
CREATE POLICY "Posts readable by signed-in users" ON public.posts
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Members create posts" ON public.posts;
CREATE POLICY "Members create posts" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id
        AND EXISTS (
            SELECT 1 FROM public.community_members m
            WHERE m.community_id = posts.community_id AND m.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Authors update own posts" ON public.posts;
CREATE POLICY "Authors update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors or admins delete posts" ON public.posts;
CREATE POLICY "Authors or admins delete posts" ON public.posts
    FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

-- Comments: same shape as posts.
DROP POLICY IF EXISTS "Comments readable by signed-in users" ON public.post_comments;
CREATE POLICY "Comments readable by signed-in users" ON public.post_comments
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users create own comments" ON public.post_comments;
CREATE POLICY "Users create own comments" ON public.post_comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors or admins delete comments" ON public.post_comments;
CREATE POLICY "Authors or admins delete comments" ON public.post_comments
    FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

-- Resources.
DROP POLICY IF EXISTS "Resources readable by signed-in users" ON public.resources;
CREATE POLICY "Resources readable by signed-in users" ON public.resources
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users share own resources" ON public.resources;
CREATE POLICY "Users share own resources" ON public.resources
    FOR INSERT WITH CHECK (auth.uid() = uploader_id);
DROP POLICY IF EXISTS "Uploaders or admins delete resources" ON public.resources;
CREATE POLICY "Uploaders or admins delete resources" ON public.resources
    FOR DELETE USING (auth.uid() = uploader_id OR public.is_admin());

-- Attendance: a learner sees their own history; a tutor sees attendance for
-- the sessions they host (SRS 3.9 "tutors monitor student participation").
DROP POLICY IF EXISTS "Attendance visible to learner and session tutor" ON public.session_attendance;
CREATE POLICY "Attendance visible to learner and session tutor" ON public.session_attendance
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_attendance.session_id AND s.tutor_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users record own attendance" ON public.session_attendance;
CREATE POLICY "Users record own attendance" ON public.session_attendance
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Points: totals are public (the leaderboard needs them). Writes go through
-- award_points() below — a client with an INSERT policy could simply award
-- itself a million points and top the leaderboard.
DROP POLICY IF EXISTS "Points readable by signed-in users" ON public.points_ledger;
CREATE POLICY "Points readable by signed-in users" ON public.points_ledger
    FOR SELECT USING (auth.role() = 'authenticated');

-- Explicitly remove the client's ability to write the ledger directly.
DROP POLICY IF EXISTS "Users earn own points" ON public.points_ledger;

/**
 * The server decides how many points each action is worth, so the amount can
 * never be supplied by the client. Called from the app via
 * supabase.rpc('award_points', ...).
 */
CREATE OR REPLACE FUNCTION public.award_points(p_reason TEXT, p_ref UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_points INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in';
    END IF;

    v_points := CASE p_reason
        WHEN 'session_attended' THEN 40
        WHEN 'post_created'     THEN 30
        WHEN 'comment_created'  THEN 10
        WHEN 'resource_shared'  THEN 50
        WHEN 'daily_task'       THEN 25
        WHEN 'meetup_attended'  THEN 35
        ELSE NULL
    END;

    IF v_points IS NULL THEN
        RAISE EXCEPTION 'Unknown points reason: %', p_reason;
    END IF;

    INSERT INTO public.points_ledger (user_id, points, reason, ref_id)
    VALUES (auth.uid(), v_points, p_reason, p_ref);

    RETURN v_points;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_points(TEXT, UUID) TO authenticated;

-- Ratings: public to read, but you cannot rate yourself.
DROP POLICY IF EXISTS "Ratings readable by everyone" ON public.ratings;
CREATE POLICY "Ratings readable by everyone" ON public.ratings
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users write own ratings" ON public.ratings;
CREATE POLICY "Users write own ratings" ON public.ratings
    FOR ALL USING (auth.uid() = rater_id)
    WITH CHECK (auth.uid() = rater_id AND rater_id <> tutor_id);

-- Reports: a reporter sees only their own; admins see and resolve everything.
DROP POLICY IF EXISTS "Reporters see own reports, admins see all" ON public.reports;
CREATE POLICY "Reporters see own reports, admins see all" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());
DROP POLICY IF EXISTS "Signed-in users file reports" ON public.reports;
CREATE POLICY "Signed-in users file reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins resolve reports" ON public.reports;
CREATE POLICY "Admins resolve reports" ON public.reports
    FOR UPDATE USING (public.is_admin());

-- Device tokens are private to their owner.
DROP POLICY IF EXISTS "Users manage own device tokens" ON public.device_tokens;
CREATE POLICY "Users manage own device tokens" ON public.device_tokens
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- G. SECURITY FIXES TO EXISTING POLICIES
--
-- The original schema grants SELECT with USING (true) on messages, which means
-- any signed-in user can read every private direct message in the database.
-- Session and community chats are broadcast rooms with no chat_participants
-- rows, so they need an explicit public flag before this can be tightened.
-- ============================================================================

ALTER TABLE public.chat_threads
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Existing group threads keep working as broadcast rooms.
UPDATE public.chat_threads SET is_public = TRUE WHERE is_group = TRUE AND is_public IS NOT TRUE;

DROP POLICY IF EXISTS "Messages viewable by thread members" ON public.messages;
DROP POLICY IF EXISTS "Messages viewable by thread participants" ON public.messages;
CREATE POLICY "Messages viewable by thread participants" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.thread_id = messages.thread_id AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.chat_threads t
            WHERE t.id = messages.thread_id AND t.is_public = TRUE
        )
    );

-- Senders may retract their own messages; admins may remove any.
DROP POLICY IF EXISTS "Senders or admins delete messages" ON public.messages;
CREATE POLICY "Senders or admins delete messages" ON public.messages
    FOR DELETE USING (auth.uid() = sender_id OR public.is_admin());

-- The original schema has no INSERT policy on recordings, so uploads would be
-- rejected even once the client code exists.
DROP POLICY IF EXISTS "Tutors publish recordings" ON public.recordings;
CREATE POLICY "Tutors publish recordings" ON public.recordings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Owners could not edit or remove their own communities, sessions or meetups.
DROP POLICY IF EXISTS "Owners update communities" ON public.communities;
CREATE POLICY "Owners update communities" ON public.communities
    FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Owners or admins delete communities" ON public.communities;
CREATE POLICY "Owners or admins delete communities" ON public.communities
    FOR DELETE USING (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Tutors update own sessions" ON public.sessions;
CREATE POLICY "Tutors update own sessions" ON public.sessions
    FOR UPDATE USING (auth.uid() = tutor_id);
DROP POLICY IF EXISTS "Tutors or admins delete sessions" ON public.sessions;
CREATE POLICY "Tutors or admins delete sessions" ON public.sessions
    FOR DELETE USING (auth.uid() = tutor_id OR public.is_admin());

DROP POLICY IF EXISTS "Organizers update own meetups" ON public.meetups;
CREATE POLICY "Organizers update own meetups" ON public.meetups
    FOR UPDATE USING (auth.uid() = organizer_id);
DROP POLICY IF EXISTS "Organizers or admins delete meetups" ON public.meetups;
CREATE POLICY "Organizers or admins delete meetups" ON public.meetups
    FOR DELETE USING (auth.uid() = organizer_id OR public.is_admin());


-- ============================================================================
-- H. REALTIME
-- ============================================================================

-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member, so
-- guard it to keep this file genuinely re-runnable.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
    END IF;
END $$;
