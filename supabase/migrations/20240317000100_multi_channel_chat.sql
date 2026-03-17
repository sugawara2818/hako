-- Create chat_channels table
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hako_id UUID NOT NULL REFERENCES hako(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add channel_id to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE;

-- Enable RLS for chat_channels
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

-- Policies for chat_channels
CREATE POLICY "Members can view chat channels" ON chat_channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create chat channels" ON chat_channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can delete chat channels" ON chat_channels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
            AND hako_members.role = 'owner'
        )
    );

-- Migration logic: Create a default channel for each hako and associate existing messages
DO $$ 
DECLARE 
    h_id UUID;
    c_id UUID;
BEGIN
    FOR h_id IN SELECT id FROM hako LOOP
        -- Check if a channel already exists for this hako (to make it idempotent-ish)
        SELECT id INTO c_id FROM chat_channels WHERE hako_id = h_id AND name = 'メインチャット' LIMIT 1;
        
        IF c_id IS NULL THEN
            INSERT INTO chat_channels (hako_id, name, description)
            VALUES (h_id, 'メインチャット', 'デフォルトのチャットルームです')
            RETURNING id INTO c_id;
        END IF;

        -- Update existing messages that don't have a channel_id
        UPDATE chat_messages 
        SET channel_id = c_id 
        WHERE hako_id = h_id AND channel_id IS NULL;
    END LOOP;
END $$;

-- Make channel_id NOT NULL after migration
ALTER TABLE chat_messages ALTER COLUMN channel_id SET NOT NULL;

-- Index for channel_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);

-- Enable Realtime for chat_channels
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
