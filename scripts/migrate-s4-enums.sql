-- Migration: S4 Post State Machine Enum Values
-- Purpose: Update existing D1 data from old enum values to new ones
-- Run via: wrangler d1 execute safework2-db --file=scripts/migrate-s4-enums.sql
-- Date: 2026-02-11

-- ReviewStatus migrations (posts table)
-- Old RECEIVED → New PENDING (initial submission state)
UPDATE posts SET review_status = 'PENDING' WHERE review_status = 'RECEIVED';

-- ActionStatus migrations (posts table)
-- Old REQUIRED → New ASSIGNED (action has been assigned)
UPDATE posts SET action_status = 'ASSIGNED' WHERE action_status = 'REQUIRED';
-- Old DONE → New COMPLETED (action work finished, pending verification)
UPDATE posts SET action_status = 'COMPLETED' WHERE action_status = 'DONE';
-- Old REOPENED → New IN_PROGRESS (re-assigned work is in progress)
UPDATE posts SET action_status = 'IN_PROGRESS' WHERE action_status = 'REOPENED';

-- ActionStatus migrations (actions table)
-- Old OPEN → New NONE (no action status yet)
UPDATE actions SET action_status = 'NONE' WHERE action_status = 'OPEN';
-- Old DONE → New COMPLETED
UPDATE actions SET action_status = 'COMPLETED' WHERE action_status = 'DONE';

-- Verification: Check for any remaining old enum values
-- SELECT review_status, COUNT(*) FROM posts GROUP BY review_status;
-- SELECT action_status, COUNT(*) FROM posts GROUP BY action_status;
-- SELECT action_status, COUNT(*) FROM actions GROUP BY action_status;
