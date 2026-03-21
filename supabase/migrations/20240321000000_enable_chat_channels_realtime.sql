-- Enable Realtime for chat_channels table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;

-- Set replica identity to FULL to ensure filters work for all event types
ALTER TABLE chat_channels REPLICA IDENTITY FULL;
