-- Add is_gallery flag to hako_timeline_posts
ALTER TABLE hako_timeline_posts ADD COLUMN IF NOT EXISTS is_gallery BOOLEAN DEFAULT false;

-- Create index for gallery queries
CREATE INDEX IF NOT EXISTS idx_hako_timeline_posts_is_gallery ON hako_timeline_posts(is_gallery) WHERE is_gallery = true;

-- Drop the previous separate gallery posts table if it exists
DROP TABLE IF EXISTS hako_gallery_posts;
