-- ============================================================================
-- Learning Commons — Migration 03 (Phase 3: close the must-haves)
--
-- Run AFTER supabase_migration_02_phase1.sql. Safe to re-run.
--
-- Covers:
--   A. File and link sharing in chat (SRS 3.7)
--   B. Community member management for tutors (SRS 3.3)
--   C. Tutor availability, so the search filter has something to filter on
--   D. Notification fan-out queue (SRS 3.8)
-- ============================================================================


-- ============================================================================
-- A. CHAT ATTACHMENTS  (SRS 3.7 — "file and link sharing")
-- ============================================================================

ALTER TABLE public.messages
    -- Storage object path in the `resources` bucket, resolved to a signed URL
    -- at read time. Never store the signed URL itself: it expires.
    ADD COLUMN IF NOT EXISTS attachment_path TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- `content` is NOT NULL, but an attachment-only message has no text. Allow an
-- empty string rather than dropping the constraint entirely.
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';


-- ============================================================================
-- B. COMMUNITY MEMBER MANAGEMENT  (SRS 3.3 — "tutors must manage members")
-- ============================================================================

ALTER TABLE public.community_members
    ADD COLUMN IF NOT EXISTS role TEXT
        CHECK (role IN ('member', 'moderator'))
        DEFAULT 'member';

/**
 * True when the caller created the community. SECURITY DEFINER so the policy
 * can read `communities` without recursing through its own RLS.
 */
CREATE OR REPLACE FUNCTION public.owns_community(p_community UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = p_community AND c.created_by = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.owns_community(UUID) TO authenticated;

-- The original policy only let a user act on their own membership row, so an
-- owner could not remove anyone.
DROP POLICY IF EXISTS "Owners manage community members" ON public.community_members;
CREATE POLICY "Owners manage community members" ON public.community_members
    FOR ALL
    USING (public.owns_community(community_id))
    WITH CHECK (public.owns_community(community_id));


-- ============================================================================
-- C. TUTOR AVAILABILITY  (SRS 3.11 — the "availability" search filter)
--
-- The filter existed in the UI with no data behind it, so it could never do
-- anything. Model it as a coarse weekly preference rather than a calendar:
-- that is what the filter chips actually offer.
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS availability TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.availability IS
    'Coarse availability windows, e.g. {"Weekday Mornings","Evenings","Weekends"}.';


-- ============================================================================
-- D. NOTIFICATION QUEUE  (SRS 3.8)
--
-- Rows are written by database triggers and drained by the `send-push` Edge
-- Function, so a notification survives the app being closed and can be retried.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notification_queue_pending_idx
    ON public.notification_queue (status, created_at)
    WHERE status = 'pending';

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Only the recipient can read their own queued notifications. Nothing in the
-- app writes here — the triggers below and the sender do.
DROP POLICY IF EXISTS "Users read own notifications" ON public.notification_queue;
CREATE POLICY "Users read own notifications" ON public.notification_queue
    FOR SELECT USING (auth.uid() = user_id);

/**
 * Queues a notification for every participant in a thread except the sender.
 */
CREATE OR REPLACE FUNCTION public.queue_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

    INSERT INTO public.notification_queue (user_id, title, body, data)
    SELECT
        cp.user_id,
        COALESCE(v_sender_name, 'New message'),
        LEFT(COALESCE(NULLIF(NEW.content, ''), 'Sent an attachment'), 140),
        jsonb_build_object('threadId', NEW.thread_id, 'type', 'message')
    FROM public.chat_participants cp
    WHERE cp.thread_id = NEW.thread_id
      AND cp.user_id <> NEW.sender_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.queue_message_notification();

/**
 * Queues a notification for every member of a community when a post lands.
 */
CREATE OR REPLACE FUNCTION public.queue_post_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_community TEXT;
BEGIN
    SELECT name INTO v_community FROM public.communities WHERE id = NEW.community_id;

    INSERT INTO public.notification_queue (user_id, title, body, data)
    SELECT
        m.user_id,
        COALESCE(v_community, 'Your community'),
        LEFT(COALESCE(NULLIF(NEW.title, ''), NEW.body), 140),
        jsonb_build_object('communityId', NEW.community_id, 'type', 'post')
    FROM public.community_members m
    WHERE m.community_id = NEW.community_id
      AND m.user_id <> NEW.author_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_created ON public.posts;
CREATE TRIGGER on_post_created
    AFTER INSERT ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.queue_post_notification();
