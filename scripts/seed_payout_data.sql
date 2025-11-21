-- Seed script to create completed visits for August, September, October 2025
-- This will enable payout generation for these months

-- First, let's check what mitras and customers we have
-- We'll create visits for them

-- Get the first customer and mitra IDs (adjust based on your actual data)
DO $$
DECLARE
  v_customer_id UUID;
  v_mitra_id UUID;
  v_customer_name VARCHAR;
  v_mitra_name VARCHAR;
  v_base_rate DECIMAL;
  v_package_id UUID;
  v_visit_count INTEGER;
  v_date DATE;
  v_visit_id UUID;
BEGIN
  -- Get active mitras
  FOR v_mitra_id, v_mitra_name, v_base_rate IN
    SELECT id, mitra_name, base_rate FROM mitra_db WHERE is_active = true LIMIT 5
  LOOP
    RAISE NOTICE 'Processing Mitra: %', v_mitra_name;

    -- Get active customers with subscriptions
    FOR v_customer_id, v_customer_name, v_package_id IN
      SELECT id, customer_name, subscription_package_id
      FROM customer_db
      WHERE subscription_status = 'Active' AND is_active = true
      LIMIT 3
    LOOP
      RAISE NOTICE '  Processing Customer: %', v_customer_name;

      -- Create visits for August 2025 (4 visits per customer)
      FOR v_visit_count IN 1..4 LOOP
        v_date := ('2025-08-' || (v_visit_count * 7)::text)::DATE;
        v_visit_id := gen_random_uuid();

        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          scheduled_date, scheduled_day, actual_date, status, visit_number,
          completed_at, created_at, updated_at
        ) VALUES (
          v_visit_id, v_customer_id, v_mitra_id, v_mitra_id, v_mitra_id,
          v_date, TO_CHAR(v_date, 'Day'), v_date, 'Done', v_visit_count,
          v_date + INTERVAL '2 hours', NOW(), NOW()
        );
      END LOOP;

      -- Create visits for September 2025 (4 visits per customer)
      FOR v_visit_count IN 1..4 LOOP
        v_date := ('2025-09-' || (v_visit_count * 7)::text)::DATE;
        v_visit_id := gen_random_uuid();

        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          scheduled_date, scheduled_day, actual_date, status, visit_number,
          completed_at, created_at, updated_at
        ) VALUES (
          v_visit_id, v_customer_id, v_mitra_id, v_mitra_id, v_mitra_id,
          v_date, TO_CHAR(v_date, 'Day'), v_date, 'Done', v_visit_count,
          v_date + INTERVAL '2 hours', NOW(), NOW()
        );
      END LOOP;

      -- Create visits for October 2025 (4 visits per customer)
      FOR v_visit_count IN 1..4 LOOP
        v_date := ('2025-10-' || (v_visit_count * 7)::text)::DATE;
        v_visit_id := gen_random_uuid();

        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          scheduled_date, scheduled_day, actual_date, status, visit_number,
          completed_at, created_at, updated_at
        ) VALUES (
          v_visit_id, v_customer_id, v_mitra_id, v_mitra_id, v_mitra_id,
          v_date, TO_CHAR(v_date, 'Day'), v_date, 'Done', v_visit_count,
          v_date + INTERVAL '2 hours', NOW(), NOW()
        );
      END LOOP;

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Completed seeding visits for August, September, October 2025';
END $$;
