-- Create Gallery Albums table
CREATE TABLE IF NOT EXISTS hako_gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hako_id UUID NOT NULL REFERENCES hako(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for albums
ALTER TABLE hako_gallery_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery albums are viewable by everyone in the hako"
  ON hako_gallery_albums FOR SELECT
  USING (EXISTS (SELECT 1 FROM hako_members WHERE hako_id = hako_gallery_albums.hako_id AND user_id = auth.uid()));

CREATE POLICY "Gallery albums are manageable by hako members"
  ON hako_gallery_albums FOR ALL
  USING (EXISTS (SELECT 1 FROM hako_members WHERE hako_id = hako_gallery_albums.hako_id AND user_id = auth.uid()));

-- Add album_id to timeline posts
ALTER TABLE hako_timeline_posts ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES hako_gallery_albums(id) ON DELETE SET NULL;

-- Ensure is_gallery column exists (it should from previous step)
ALTER TABLE hako_timeline_posts ADD COLUMN IF NOT EXISTS is_gallery BOOLEAN DEFAULT false;

-- Create index for album queries
CREATE INDEX IF NOT EXISTS idx_hako_timeline_posts_album_id ON hako_timeline_posts(album_id);
