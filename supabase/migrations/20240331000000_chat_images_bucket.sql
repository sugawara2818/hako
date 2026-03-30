-- Create chat-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'chat-images', 'chat-images', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat-images'
);

-- RLS Policies for chat-images
-- 1. Allow public to view images (since bucket is public)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');

-- 2. Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND bucket_id = 'chat-images'
);

-- 3. Allow users to delete their own images
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE USING (
    auth.uid() = owner AND bucket_id = 'chat-images'
);
