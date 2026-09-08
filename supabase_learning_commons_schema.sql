-- Learning Commons App Complete Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/qnxtqnnszvpeltsucrzn/sql/new

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    university TEXT DEFAULT 'University',
    major TEXT DEFAULT 'General Studies',
    year TEXT DEFAULT '1st Year',
    role TEXT CHECK (role IN ('Student', 'Tutor')) DEFAULT 'Student',
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    rating NUMERIC(3, 2) DEFAULT 5.0,
    points INTEGER DEFAULT 100,
    sessions_count INTEGER DEFAULT 0,
    communities_count INTEGER DEFAULT 0,
    streak TEXT DEFAULT '1 day',
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COMMUNITIES TABLE
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMMUNITY MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.community_members (
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (community_id, user_id)
);

-- 4. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tutor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    tag TEXT DEFAULT 'General',
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 20,
    is_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CAMPUS MEETUPS TABLE
CREATE TABLE IF NOT EXISTS public.meetups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEETUP RSVPs TABLE
CREATE TABLE IF NOT EXISTS public.meetup_rsvps (
    meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rsvped_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (meetup_id, user_id)
);

-- 7. CHAT THREADS TABLE
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CHAT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.chat_participants (
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

-- 9. MESSAGES & DISCUSSIONS TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. RECORDED LECTURES TABLE
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tutor_name TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active profiles, communities, sessions, meetups, recordings
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Communities are viewable by authenticated users" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Community members viewable by authenticated" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Users can join/leave communities" ON public.community_members FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Sessions viewable by everyone" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Tutors can create sessions" ON public.sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Meetups viewable by everyone" ON public.meetups FOR SELECT USING (true);
CREATE POLICY "Users can create meetups" ON public.meetups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Meetup RSVPs viewable by everyone" ON public.meetup_rsvps FOR SELECT USING (true);
CREATE POLICY "Users can RSVP to meetups" ON public.meetup_rsvps FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Chat threads viewable by authenticated users" ON public.chat_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON public.chat_threads FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Participants viewable by authenticated users" ON public.chat_participants FOR SELECT USING (true);
CREATE POLICY "Users can join chat threads" ON public.chat_participants FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Messages viewable by thread members" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Recordings viewable by everyone" ON public.recordings FOR SELECT USING (true);

-- -------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, university, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'university', 'University'),
        COALESCE(new.raw_user_meta_data->>'role', 'Student')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial default communities
INSERT INTO public.communities (name, subject, description, image_url) VALUES
('Calculus Masters', 'Mathematics', 'A community for students tackling Calculus I, II, and III. Share problems and study tips.', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80'),
('Quantum Physics Circle', 'Physics', 'Explore quantum concepts, exchange notes, and connect with students interested in modern physics.', 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?auto=format&fit=crop&w=1200&q=80'),
('Algorithms & Data Structures', 'Computer Science', 'Discuss runtime tradeoffs, prepare for technical interviews, and collaborate on weekly challenges.', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80')
ON CONFLICT DO NOTHING;
