-- Migration: 20240331000100_bbs_schema.sql
-- Description: Create BBS (Bulletin Board System) tables and RLS policies

-- Create bbs_threads table
CREATE TABLE IF NOT EXISTS public.bbs_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hako_id UUID NOT NULL REFERENCES public.hako(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_post_at TIMESTAMPTZ DEFAULT now(),
    post_count INT DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false
);

-- Create bbs_posts table
CREATE TABLE IF NOT EXISTS public.bbs_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.bbs_threads(id) ON DELETE CASCADE,
    hako_id UUID NOT NULL REFERENCES public.hako(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    post_number INT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bbs_threads_hako_id ON public.bbs_threads(hako_id);
CREATE INDEX IF NOT EXISTS idx_bbs_posts_thread_id ON public.bbs_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_bbs_posts_hako_id ON public.bbs_posts(hako_id);

-- Enable RLS
ALTER TABLE public.bbs_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbs_posts ENABLE ROW LEVEL SECURITY;

-- Policies for bbs_threads
CREATE POLICY "Members can view threads" ON public.bbs_threads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.hako_members
            WHERE hako_members.hako_id = bbs_threads.hako_id
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create threads" ON public.bbs_threads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.hako_members
            WHERE hako_members.hako_id = bbs_threads.hako_id
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage threads" ON public.bbs_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.hako
            WHERE hako.id = bbs_threads.hako_id
            AND hako.owner_id = auth.uid()
        )
    );

-- Policies for bbs_posts
CREATE POLICY "Members can view posts" ON public.bbs_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.hako_members
            WHERE hako_members.hako_id = bbs_posts.hako_id
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create posts" ON public.bbs_posts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.hako_members
            WHERE hako_members.hako_id = bbs_posts.hako_id
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage posts" ON public.bbs_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.hako
            WHERE hako.id = bbs_posts.hako_id
            AND hako.owner_id = auth.uid()
        )
    );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bbs_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bbs_posts;
