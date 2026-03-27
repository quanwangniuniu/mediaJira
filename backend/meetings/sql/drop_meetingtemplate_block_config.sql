-- Fix: remove legacy NOT NULL column block_config from MeetingTemplate.
-- Models use layout_config only. Run after backup if needed.

-- PostgreSQL (recommended: IF EXISTS)
ALTER TABLE meetings_meetingtemplate DROP COLUMN IF EXISTS block_config;

-- SQLite 3.35+ (no IF EXISTS on DROP COLUMN; skip if column already gone)
-- ALTER TABLE meetings_meetingtemplate DROP COLUMN block_config;
