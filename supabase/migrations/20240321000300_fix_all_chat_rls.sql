-- Ensure owners and creators can always see and manage their channels
-- This bypasses potential recursion or restrictive subquery issues

-- 1. Update chat_channels SELECT policy
DROP POLICY IF EXISTS "Members can view chat channels" ON chat_channels;
CREATE POLICY "Members can view chat channels" ON chat_channels
    FOR SELECT USING (
        -- 1. Creator can always see
        created_by = auth.uid()
        OR
        -- 2. Hako Owner can see everything in their Hako
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
            AND hako_members.role = 'owner'
        )
        OR
        -- 3. Public channels are visible to all members
        (type = 'public' AND EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        ))
        OR
        -- 4. Private channels are visible to members
        (type = 'private' AND is_chat_channel_member(id, auth.uid()))
    );

-- 2. Ensure INSERT policy is robust
DROP POLICY IF EXISTS "Members can create chat channels" ON chat_channels;
CREATE POLICY "Members can create chat channels" ON chat_channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );
