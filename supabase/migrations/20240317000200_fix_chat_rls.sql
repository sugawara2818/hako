-- Drop the old policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Members can create chat channels" ON chat_channels;

-- Create a more robust INSERT policy for chat_channels
-- This ensures that the user attempting to create a channel is indeed a member of that Hako.
CREATE POLICY "Members can create chat channels" ON chat_channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = hako_id -- refers to the hako_id in the row being inserted
            AND hako_members.user_id = auth.uid()
        )
    );

-- Also ensure the created_by matches the current user if provided (optional but good practice)
-- ALTER POLICY "Members can create chat channels" ON chat_channels
-- WITH CHECK (
--     auth.uid() = created_by AND
--     EXISTS (...)
-- );

-- Verify SELECT policy as well
DROP POLICY IF EXISTS "Members can view chat channels" ON chat_channels;
CREATE POLICY "Members can view chat channels" ON chat_channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );

-- Verify DELETE policy
DROP POLICY IF EXISTS "Owners can delete chat channels" ON chat_channels;
CREATE POLICY "Owners can delete chat channels" ON chat_channels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
            AND hako_members.role = 'owner'
        )
    );
