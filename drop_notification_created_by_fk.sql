-- Drop the foreign key constraint on notifications.created_by
-- This constraint is no longer needed since created_by is now just a string field

ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS FK_9a8a82462cab47c73d25f49261f;

