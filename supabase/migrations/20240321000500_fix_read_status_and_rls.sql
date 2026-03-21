-- 1. Add UPDATE policy for chat_channel_members
-- Allows users to update their own read status
DROP POLICY IF EXISTS "Members can update their own read status" ON chat_channel_members;
CREATE POLICY "Members can update their own read status" ON chat_channel_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2. Ensure chat_channel_members is in the realtime publication if not already
-- This is needed for the "Read" marker to update in real-time
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_channel_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
    END IF;
END $$;

-- 3. Set replica identity to FULL to ensure we get all info in the realtime payload
ALTER TABLE chat_channel_members REPLICA IDENTITY FULL;
