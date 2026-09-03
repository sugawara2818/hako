-- Add INSERT policy for chat_channel_members
-- Allows any Hako member to join a channel or invite others in the same Hako
DROP POLICY IF EXISTS "Members can join or invite to channels" ON chat_channel_members;
CREATE POLICY "Members can join or invite to channels" ON chat_channel_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = get_channel_hako_id(channel_id)
            AND hako_members.user_id = auth.uid()
        )
    );

-- Add DELETE policy for chat_channel_members
-- Allows users to leave a channel, or Hako owners to remove members
DROP POLICY IF EXISTS "Members can leave or remove from channels" ON chat_channel_members;
CREATE POLICY "Members can leave or remove from channels" ON chat_channel_members
    FOR DELETE USING (
        user_id = auth.uid() -- Can always remove self
        OR
        EXISTS ( -- Hako owners can remove anyone
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = get_channel_hako_id(channel_id)
            AND hako_members.user_id = auth.uid()
            AND hako_members.role = 'owner'
        )
    );
