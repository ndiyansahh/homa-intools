-- Migration: Add visits_per_week column to subscription_package_db
-- Bug Fix: Allow storing frequency as dedicated DB column instead of parsing from name
-- Date: 2026-04-08
-- Environment: Neon (Development / Staging)

-- Step 1: Add visits_per_week column
ALTER TABLE "subscription_package_db"
ADD COLUMN IF NOT EXISTS "visits_per_week" integer DEFAULT 1 NOT NULL;

-- Step 2: Add check constraint
ALTER TABLE "subscription_package_db"
ADD CONSTRAINT IF NOT EXISTS "visits_per_week_range" CHECK (visits_per_week >= 0 AND visits_per_week <= 7);

-- Step 3: Update existing packages - extract frequency from package name
-- Pattern 1: "Nx/week" format
UPDATE "subscription_package_db"
SET visits_per_week = (
  CASE
    WHEN subscription_package ~* '0\s*x[/\s]*(per\s*)?week' THEN 0
    WHEN subscription_package ~* '1\s*x[/\s]*(per\s*)?week' THEN 1
    WHEN subscription_package ~* '2\s*x[/\s]*(per\s*)?week' THEN 2
    WHEN subscription_package ~* '3\s*x[/\s]*(per\s*)?week' THEN 3
    WHEN subscription_package ~* '4\s*x[/\s]*(per\s*)?week' THEN 4
    WHEN subscription_package ~* '5\s*x[/\s]*(per\s*)?week' THEN 5
    WHEN subscription_package ~* '6\s*x[/\s]*(per\s*)?week' THEN 6
    WHEN subscription_package ~* '7\s*x[/\s]*(per\s*)?week' THEN 7
    ELSE visits_per_week
  END
)
WHERE subscription_package ~* '\d+\s*x[/\s]*(per\s*)?week';

-- Pattern 2: "N visit(s) per week" format
UPDATE "subscription_package_db"
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

-- Step 4: Set Trial packages to 0 visits
UPDATE "subscription_package_db"
SET visits_per_week = 0
WHERE LOWER(subscription_package) LIKE '%trial%'
  AND visits_per_week = 1;

-- Verification
SELECT subscription_package, visits_per_week, price_per_qty
FROM "subscription_package_db"
ORDER BY visits_per_week, subscription_package;
