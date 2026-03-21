-- Add pinning support to chat channels
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Policy to allow members to toggle pin (usually and ideally per-user, but here we'll do it globally for the channel for now as requested or implied)
-- If it's a shared Hako, maybe only owners/creators should pin? 
-- The user said "ルームの固定機能追加". I'll allow anyone who can view to pin for now, or maybe only owners/creators.
-- Actually, let's make it so anyone can pin/unpin if they are a member.

DROP POLICY IF EXISTS "Members can pin channels" ON chat_channels;
CREATE POLICY "Members can pin channels" ON chat_channels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = chat_channels.hako_id 
            AND hako_members.user_id = auth.uid()
        )
    );
