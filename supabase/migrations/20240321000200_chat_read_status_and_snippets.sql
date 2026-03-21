-- 1. Add last_read_at to chat_channel_members
ALTER TABLE chat_channel_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT now();

-- 2. Add message snippet tracking to chat_channels
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS last_message_content TEXT;
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- 3. Update existing channels with their latest message info (optional but good for data consistency)
DO $$ 
DECLARE 
    ch_record RECORD;
    last_msg RECORD;
BEGIN
    FOR ch_record IN SELECT id FROM chat_channels LOOP
        SELECT content, created_at INTO last_msg 
        FROM chat_messages 
        WHERE channel_id = ch_record.id 
        ORDER BY created_at DESC 
        LIMIT 1;

        IF last_msg.content IS NOT NULL THEN
            UPDATE chat_channels 
            SET last_message_content = last_msg.content,
                last_message_at = last_msg.created_at
            WHERE id = ch_record.id;
        END IF;
    END LOOP;
END $$;
