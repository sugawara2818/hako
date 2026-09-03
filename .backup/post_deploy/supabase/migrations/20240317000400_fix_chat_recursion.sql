-- Helper Function: Get Hako ID from Channel ID (Bypasses RLS to break recursion)
CREATE OR REPLACE FUNCTION get_channel_hako_id(chan_id UUID)
RETURNS UUID AS $$
    SELECT hako_id FROM chat_channels WHERE id = chan_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Check if user is a member of the channel (Bypasses RLS to break recursion)
CREATE OR REPLACE FUNCTION is_chat_channel_member(chan_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM chat_channel_members 
        WHERE channel_id = chan_id AND user_id = check_user_id
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update RLS for chat_channels
DROP POLICY IF EXISTS "Members can view chat channels" ON chat_channels;
CREATE POLICY "Members can view chat channels" ON chat_channels
    FOR SELECT USING (
        (created_by = auth.uid()) -- Creator can always see (important during creation)
        OR 
        (type = 'public' AND EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        ))
        OR 
        (type = 'private' AND is_chat_channel_member(id, auth.uid()))
    );

-- Update RLS for chat_channel_members (Breaks recursion by using Security Definer)
DROP POLICY IF EXISTS "Members can view channel participants" ON chat_channel_members;
CREATE POLICY "Members can view channel participants" ON chat_channel_members
    FOR SELECT USING (
        user_id = auth.uid() -- Can always see your own memberships
        OR
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = get_channel_hako_id(channel_id)
            AND hako_members.user_id = auth.uid()
        )
    );

-- Update RLS for chat_messages (More robust access check)
DROP POLICY IF EXISTS "Members can view chat messages" ON chat_messages;
CREATE POLICY "Members can view chat messages" ON chat_messages
    FOR SELECT USING (
        is_chat_channel_member(channel_id, auth.uid()) OR
        EXISTS (
            SELECT 1 FROM chat_channels 
            WHERE id = channel_id AND type = 'public' AND EXISTS (
                SELECT 1 FROM hako_members 
                WHERE hako_members.hako_id = chat_channels.hako_id 
                AND hako_members.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Members can send chat messages" ON chat_messages;
CREATE POLICY "Members can send chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        is_chat_channel_member(channel_id, auth.uid()) OR
        EXISTS (
            SELECT 1 FROM chat_channels 
            WHERE id = channel_id AND type = 'public' AND EXISTS (
                SELECT 1 FROM hako_members 
                WHERE hako_members.hako_id = chat_channels.hako_id 
                AND hako_members.user_id = auth.uid()
            )
        )
    );
