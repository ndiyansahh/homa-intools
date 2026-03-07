-- Migration: Add visits_per_week column to subscription_package_db
-- Bug #4 Fix: Allow storing frequency as separate field instead of parsing from name
-- Date: 2026-03-07
-- Environment: VPS Production

-- Add visits_per_week column (default 1 for backward compatibility)
ALTER TABLE subscription_package_db
ADD COLUMN IF NOT EXISTS visits_per_week INTEGER DEFAULT 1 NOT NULL;

-- Add check constraint (0-7 visits per week is reasonable)
ALTER TABLE subscription_package_db
ADD CONSTRAINT visits_per_week_range CHECK (visits_per_week >= 0 AND visits_per_week <= 7);

-- Update existing packages: Extract frequency from package name
-- Pattern 1: "Nx/week" or "N x/week" format
UPDATE subscription_package_db
SET visits_per_week = (
  CASE
    -- Match "0x" or "0 x" patterns (trial packages)
    WHEN subscription_package ~* '0\s*x[/\s]*(per\s*)?week' THEN 0
    -- Match "1x" or "1 x" patterns
    WHEN subscription_package ~* '1\s*x[/\s]*(per\s*)?week' THEN 1
    -- Match "2x" or "2 x" patterns
    WHEN subscription_package ~* '2\s*x[/\s]*(per\s*)?week' THEN 2
    -- Match "3x" or "3 x" patterns
    WHEN subscription_package ~* '3\s*x[/\s]*(per\s*)?week' THEN 3
    -- Match "4x" or "4 x" patterns
    WHEN subscription_package ~* '4\s*x[/\s]*(per\s*)?week' THEN 4
    -- Match "5x" or "5 x" patterns
    WHEN subscription_package ~* '5\s*x[/\s]*(per\s*)?week' THEN 5
    -- Match "6x" or "6 x" patterns
    WHEN subscription_package ~* '6\s*x[/\s]*(per\s*)?week' THEN 6
    -- Match "7x" or "7 x" patterns
    WHEN subscription_package ~* '7\s*x[/\s]*(per\s*)?week' THEN 7
    -- Default to current value (don't change)
    ELSE visits_per_week
  END
)
WHERE subscription_package ~* '\d+\s*x[/\s]*(per\s*)?week';

-- Pattern 2: "N visit(s) per week" format (handles singular/plural)
UPDATE subscription_package_db
SET visits_per_week = (
  CASE
    WHEN subscription_package ~* '0\s*visits?\s*per\s*week' THEN 0
    WHEN subscription_package ~* '1\s*visits?\s*per\s*week' THEN 1
    WHEN subscription_package ~* '2\s*visits?\s*per\s*week' THEN 2
    WHEN subscription_package ~* '3\s*visits?\s*per\s*week' THEN 3
    WHEN subscription_package ~* '4\s*visits?\s*per\s*week' THEN 4
    WHEN subscription_package ~* '5\s*visits?\s*per\s*week' THEN 5
    WHEN subscription_package ~* '6\s*visits?\s*per\s*week' THEN 6
    WHEN subscription_package ~* '7\s*visits?\s*per\s*week' THEN 7
    ELSE visits_per_week
  END
)
WHERE subscription_package ~* '\d+\s*visits?\s*per\s*week';

-- Set Trial packages to 0 visits
UPDATE subscription_package_db
SET visits_per_week = 0
WHERE LOWER(subscription_package) LIKE '%trial%'
  AND visits_per_week = 1;  -- Only update if still default value

-- Verification query
SELECT
  subscription_package,
  visits_per_week,
  price_per_qty
FROM subscription_package_db
ORDER BY visits_per_week, subscription_package;

COMMENT ON COLUMN subscription_package_db.visits_per_week IS 'Number of cleaning visits scheduled per week (0 = trial, 1-7 = regular)';
