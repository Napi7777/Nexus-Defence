-- ============================================================================
-- Learning Commons — Migration 04 (Phase 4: close the remaining SRS gaps)
--
-- Run AFTER supabase_migration_03_phase3.sql, in the Supabase SQL editor.
-- Safe to re-run: every statement is idempotent.
--
-- Covers:
--   A. Real per-community/per-session GROUP chat threads (SRS 3.7 — the app
--      previously had no group chat, only 1:1 messaging and community posts)
--   B. A points-ledger reason for tutor ratings, so reviews are tamper-proof
--      like every other reward instead of a client-trusted local number
--      (SRS 3.10)
--   C. Admin ability to suspend a user's account (SRS 3.12 — "manage users")
--   D. Automatic "upcoming session / meetup" reminders (SRS 3.8) — the only
--      one of the three required notification triggers that had no backend
--      logic at all
--   E. Enabling the extensions the push-notification cron job needs, so the
--      one remaining manual step (pasting your own project URL + service key)
--      is the only thing left to do outside of this file
-- ============================================================================


-- ============================================================================
-- A. GROUP CHAT THREADS  (SRS 3.7 — "real-time chat within communities")
--
-- `messages.thread_id` is free-form TEXT (see migration 02's note on why), and
-- the RLS policy on `messages` treats a thread as public when its id matches a
-- real `chat_threads` row that has `is_public = TRUE` — NOT when the thread_id
-- merely looks like one. A client that invents a string such as
-- 'community-<uuid>' without ever inserting that row satisfies neither half of
-- the SELECT policy (no chat_threads row to match, and no chat_participants
-- rows either), so reads on that thread silently return nothing. Every group
-- room (a community's chat, a live session's in-call chat) must resolve to a
-- REAL chat_threads.id — that's what `getOrCreateGroupThread()` in
-- src/lib/supabase/messaging.ts now does, keyed by `group_key` below.
-- ============================================================================

ALTER TABLE public.chat_threads
    ADD COLUMN IF NOT EXISTS group_key TEXT;

COMMENT ON COLUMN public.chat_threads.group_key IS
    'Stable lookup key for a broadcast room, e.g. "community:<id>" or '
    '"session:<id>". NULL for ordinary 1:1 threads. Unique so two concurrent '
    'first-openers of the same room cannot create two rows for it.';

CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_group_key_key
    ON public.chat_threads (group_key)
    WHERE group_key IS NOT NULL;


-- ============================================================================
-- B. RATINGS EARN LEDGER POINTS  (SRS 3.10)
--
-- The app awarded "+15 XP" for submitting a tutor rating by editing
-- `profiles.points` directly on the client — exactly the kind of client-
-- trusted mutation `award_points()` exists to prevent everywhere else. Adding
-- a ledger reason means a rating pays out through the same tamper-resistant
-- path as attending a session or sharing a resource.
-- ============================================================================

ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_check
    CHECK (reason IN (
        'session_attended', 'post_created', 'comment_created',
        'resource_shared', 'daily_task', 'meetup_attended', 'rating_given'
    ));

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
        WHEN 'rating_given'     THEN 15
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


-- ============================================================================
-- C. ADMIN: SUSPEND A USER  (SRS 3.12 — "Admin must: Manage users")
--
-- `is_admin` already gates the moderation queue; nothing previously let an
-- admin act on a *user* rather than a single piece of content. A suspended
-- user's own client signs them out as soon as it next reads its own profile
-- (see App.tsx) — that is a cooperative check, not a security boundary on its
-- own, so it is backed here by real RLS: a suspended account can no longer
-- write new posts, messages or resources even if its client were modified to
-- ignore the flag.
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.current_user_is_banned()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_banned() TO authenticated;

-- Only an admin may set/clear the flag on someone else — never on themselves,
-- so an admin cannot accidentally (or a compromised admin session cannot)
-- lock every admin out at once.
DROP POLICY IF EXISTS "Admins manage user standing" ON public.profiles;
CREATE POLICY "Admins manage user standing" ON public.profiles
    FOR UPDATE USING (public.is_admin() AND auth.uid() <> id)
    WITH CHECK (public.is_admin() AND auth.uid() <> id);

-- Block a banned account's writes at the tables that matter most: new
-- content and new messages. (Reads stay allowed — a suspension removes the
-- ability to post, not the person's own visibility into what they already
-- said, which is a separate, human moderation decision.)
DROP POLICY IF EXISTS "Members create posts" ON public.posts;
CREATE POLICY "Members create posts" ON public.posts
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND NOT public.current_user_is_banned()
    );

DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
CREATE POLICY "Authenticated users can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND NOT public.current_user_is_banned()
    );

DROP POLICY IF EXISTS "Users share own resources" ON public.resources;
CREATE POLICY "Users share own resources" ON public.resources
    FOR INSERT WITH CHECK (
        auth.uid() = uploader_id AND NOT public.current_user_is_banned()
    );


-- ============================================================================
-- D. UPCOMING SESSION / MEETUP REMINDERS  (SRS 3.8)
--
-- Messages and community-post notifications already fan out via triggers
-- (migration 03). "Upcoming sessions" had no equivalent — nothing ever
-- queued a reminder ahead of a session or meetup's start time. This runs
-- entirely as SQL (no external call, no secret), so — unlike send-push's
-- cron entry — it is safe to schedule right here in the migration itself.
-- ============================================================================

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.meetups ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.queue_upcoming_reminders()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Live sessions starting in the next 15 minutes: remind the members of
    -- the hosting community (everyone who'd plausibly want to join), minus
    -- the tutor hosting it.
    WITH due_sessions AS (
        SELECT s.id, s.title, s.community_id, s.tutor_id, s.scheduled_at
        FROM public.sessions s
        WHERE s.reminder_sent_at IS NULL
          AND s.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
          AND s.community_id IS NOT NULL
    )
    INSERT INTO public.notification_queue (user_id, title, body, data)
    SELECT
        cm.user_id,
        'Starting soon',
        LEFT(ds.title, 140) || ' starts in a few minutes',
        jsonb_build_object('sessionId', ds.id, 'type', 'session_reminder')
    FROM due_sessions ds
    JOIN public.community_members cm ON cm.community_id = ds.community_id
    WHERE cm.user_id <> ds.tutor_id;

    UPDATE public.sessions
    SET reminder_sent_at = NOW()
    WHERE reminder_sent_at IS NULL
      AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
      AND community_id IS NOT NULL;

    -- In-person meetups starting in the next 30 minutes: remind everyone who
    -- actually RSVP'd, minus the organizer.
    WITH due_meetups AS (
        SELECT m.id, m.title, m.organizer_id, m.scheduled_at
        FROM public.meetups m
        WHERE m.reminder_sent_at IS NULL
          AND m.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '30 minutes'
    )
    INSERT INTO public.notification_queue (user_id, title, body, data)
    SELECT
        r.user_id,
        'Meetup starting soon',
        LEFT(dm.title, 140) || ' is coming up',
        jsonb_build_object('meetupId', dm.id, 'type', 'meetup_reminder')
    FROM due_meetups dm
    JOIN public.meetup_rsvps r ON r.meetup_id = dm.id
    WHERE r.user_id <> dm.organizer_id;

    UPDATE public.meetups
    SET reminder_sent_at = NOW()
    WHERE reminder_sent_at IS NULL
      AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '30 minutes';
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_upcoming_reminders() TO authenticated, service_role;


-- ============================================================================
-- E. SCHEDULING  (SRS 3.8 — enable the extensions; wire the jobs)
--
-- pg_cron/pg_net let Postgres call itself and the outside world on a timer —
-- neither was ever enabled, which is why "Schedule it with pg_cron" in
-- supabase/functions/send-push/index.ts stayed a comment instead of a fact.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Part D above needs no secret, so it can schedule itself right here.
-- cron.schedule() re-registering an existing job name updates it in place,
-- so this is safe to re-run along with everything else in this file.
SELECT cron.schedule(
    'queue-session-reminders',
    '*/5 * * * *',
    $$ SELECT public.queue_upcoming_reminders(); $$
);

-- send-push needs this project's own URL and a service-role key, which must
-- never be committed to a file like this one — so it is the one manual step
-- left. Run it once in the SQL editor, filling in your own values:
--
--   select cron.schedule('drain-push', '* * * * *', $$
--     select net.http_post(
--       url := 'https://<your-project-ref>.supabase.co/functions/v1/send-push',
--       headers := jsonb_build_object('Authorization', 'Bearer <your-service-role-key>')
--     );
--   $$);
--
-- (Find both values under Project Settings → API. Deploy the function first
-- with `supabase functions deploy send-push`.)
