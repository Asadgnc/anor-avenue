-- Migration 007: Housekeeping role restrictions, inventory (depo), garden tasks
-- NOTE: ALTER TYPE ADD VALUE cannot be used in the same transaction as other statements.
-- Step 1: Add 'cleaned' enum value (must be committed before Step 2 uses it).

ALTER TYPE cleaning_status ADD VALUE IF NOT EXISTS 'cleaned' AFTER 'in_progress';
