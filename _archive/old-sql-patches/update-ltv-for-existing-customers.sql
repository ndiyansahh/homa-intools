-- Update LTV for existing customers who have subscription dates but LTV = 0
-- LTV calculation: months between subscription_start and subscription_end (or today if no end date)

UPDATE customer_db 
SET ltv = CASE 
  WHEN subscription_start IS NOT NULL AND subscription_end IS NOT NULL THEN 
    EXTRACT(YEAR FROM AGE(subscription_end + INTERVAL '1 day', subscription_start)) * 12 + 
    EXTRACT(MONTH FROM AGE(subscription_end + INTERVAL '1 day', subscription_start))
  WHEN subscription_start IS NOT NULL AND subscription_end IS NULL THEN 
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, subscription_start)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, subscription_start))
  ELSE 0
END,
updated_at = CURRENT_TIMESTAMP
WHERE ltv = 0 AND subscription_start IS NOT NULL;

-- Show updated results
SELECT customer_name, subscription_start, subscription_end, ltv, subscription_status 
FROM customer_db 
WHERE subscription_start IS NOT NULL 
ORDER BY updated_at DESC 
LIMIT 10;