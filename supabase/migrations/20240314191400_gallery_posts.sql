-- Create hako_gallery_posts table
CREATE TABLE IF NOT EXISTS hako_gallery_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hako_id UUID NOT NULL REFERENCES hako(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE hako_gallery_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view gallery posts in their hako" ON hako_gallery_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = hako_gallery_posts.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create gallery posts in their hako" ON hako_gallery_posts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = hako_gallery_posts.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own gallery posts" ON hako_gallery_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_hako_gallery_posts_hako_id ON hako_gallery_posts(hako_id);
CREATE INDEX IF NOT EXISTS idx_hako_gallery_posts_created_at ON hako_gallery_posts(created_at DESC);
