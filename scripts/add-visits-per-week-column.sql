-- Migration: Add visits_per_week column to subscription_package_db
-- Date: 2026-03-09
-- Purpose: Fix /api/packages 500 error in staging

-- Add column if not exists
ALTER TABLE subscription_package_db
ADD COLUMN IF NOT EXISTS visits_per_week INTEGER DEFAULT 1 NOT NULL;

-- Update values based on package name patterns
UPDATE subscription_package_db
SET visits_per_week = 1
WHERE package_name LIKE '%1x/week%' OR package_name LIKE '%1 visit%';

UPDATE subscription_package_db
SET visits_per_week = 2
WHERE package_name LIKE '%2x/week%' OR package_name LIKE '%2 visit%';

UPDATE subscription_package_db
SET visits_per_week = 3
WHERE package_name LIKE '%3x/week%' OR package_name LIKE '%3 visit%';

-- Verify the changes
SELECT id, package_name, visits_per_week
FROM subscription_package_db
ORDER BY visits_per_week, package_name;
