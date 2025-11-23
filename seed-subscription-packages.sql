-- Seed Data: HOMA Actual Subscription Packages
-- Business packages with 3 hours per visit

INSERT INTO subscription_package_db (subscription_package, price_per_qty, price_numeric) VALUES
-- Trial Package (Free trial visit)
('Trial', 'Rp0', 0.00),

-- Monthly Subscription Packages (3 hours per visit)
('Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 'Rp562,500', 562500.00),
('Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 'Rp600,000', 600000.00),
('Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 'Rp1,125,000', 1125000.00),
('Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 'Rp1,650,000', 1650000.00);

-- Verify data
SELECT subscription_package, price_per_qty, price_numeric
FROM subscription_package_db
ORDER BY price_numeric;
