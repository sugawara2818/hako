-- Add sort_order to hako table
ALTER TABLE hako ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing hakos to have unique sort_order based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM hako
)
UPDATE hako
SET sort_order = numbered.row_num
FROM numbered
WHERE hako.id = numbered.id;
