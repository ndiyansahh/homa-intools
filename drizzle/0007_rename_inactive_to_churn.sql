-- Rename subscription_status 'Inactive' to 'Churn' for all customers
UPDATE "customer_db" SET "subscription_status" = 'Churn' WHERE "subscription_status" = 'Inactive';
