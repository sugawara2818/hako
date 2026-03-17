-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hako_id UUID NOT NULL REFERENCES hako(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_messages.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can send chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_messages.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own chat messages" ON chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_hako_id ON chat_messages(hako_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
