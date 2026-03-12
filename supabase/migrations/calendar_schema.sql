-- Add hako_calendar_events table
CREATE TABLE IF NOT EXISTS hako_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hako_id UUID NOT NULL REFERENCES hako(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#3b82f6',
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE hako_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view public events or their own events" ON hako_calendar_events
    FOR SELECT USING (
        (is_private = false AND EXISTS (
            SELECT 1 FROM hako_members 
            WHERE hako_members.hako_id = hako_calendar_events.hako_id 
            AND hako_members.user_id = auth.uid()
        ))
        OR (user_id = auth.uid())
    );

CREATE POLICY "Members can create events in their hako" ON hako_calendar_events
    FOR INSERT WITH CHECK (
        hako_id IN (
            SELECT hako_id FROM hako_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own events" ON hako_calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON hako_calendar_events
    FOR DELETE USING (auth.uid() = user_id);
    
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_hako_id ON hako_calendar_events(hako_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON hako_calendar_events(start_at, end_at);
