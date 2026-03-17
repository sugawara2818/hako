-- Create channel type enum
DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add type column to chat_channels
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS type channel_type DEFAULT 'public';

-- Create chat_channel_members table
CREATE TABLE IF NOT EXISTS chat_channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- Enable RLS for chat_channel_members
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;

-- Policies for chat_channel_members
CREATE POLICY "Members can view channel participants" ON chat_channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = (SELECT hako_id FROM chat_channels WHERE id = chat_channel_members.channel_id)
            AND hako_members.user_id = auth.uid()
        )
    );

-- Update RLS for chat_channels to handle private visibility
DROP POLICY IF EXISTS "Members can view chat channels" ON chat_channels;
CREATE POLICY "Members can view chat channels" ON chat_channels
    FOR SELECT USING (
        (type = 'public' AND EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        ))
        OR 
        (type = 'private' AND EXISTS (
            SELECT 1 FROM chat_channel_members 
            WHERE chat_channel_members.channel_id = chat_channels.id 
            AND chat_channel_members.user_id = auth.uid()
        ))
    );

-- Update RLS for chat_messages to filter by channel access
DROP POLICY IF EXISTS "Members can view chat messages" ON chat_messages;
CREATE POLICY "Members can view chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_channels
            WHERE chat_channels.id = chat_messages.channel_id
            AND (
                (chat_channels.type = 'public' AND EXISTS (
                    SELECT 1 FROM hako_members 
                    WHERE hako_members.hako_id = chat_channels.hako_id 
                    AND hako_members.user_id = auth.uid()
                ))
                OR 
                (chat_channels.type = 'private' AND EXISTS (
                    SELECT 1 FROM chat_channel_members 
                    WHERE chat_channel_members.channel_id = chat_channels.id 
                    AND chat_channel_members.user_id = auth.uid()
                ))
            )
        )
    );

DROP POLICY IF EXISTS "Members can send chat messages" ON chat_messages;
CREATE POLICY "Members can send chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_channels
            WHERE chat_channels.id = channel_id
            AND (
                (chat_channels.type = 'public' AND EXISTS (
                    SELECT 1 FROM hako_members 
                    WHERE hako_members.hako_id = chat_channels.hako_id 
                    AND hako_members.user_id = auth.uid()
                ))
                OR 
                (chat_channels.type = 'private' AND EXISTS (
                    SELECT 1 FROM chat_channel_members 
                    WHERE chat_channel_members.channel_id = chat_channels.id 
                    AND chat_channel_members.user_id = auth.uid()
                ))
            )
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_id ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_channel_id ON chat_channel_members(channel_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
