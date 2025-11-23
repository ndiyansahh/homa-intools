-- =====================================================
-- DYNAMIC SEED: Visits & Payouts for September-October 2025
-- For Sri Rahayu, Budi Santoso & Ani Yulianti
-- =====================================================
-- This script:
-- 1. Reads EXISTING customers assigned to the mitras
-- 2. Generates visits dynamically based on their subscription patterns
-- 3. Marks visits as "Done" for Sept-Oct 2025
-- 4. Auto-calculates payouts from completed visits
-- 5. Ani Yulianti: NOT ELIGIBLE for bonus (bonus = 0)
-- =====================================================

DO $$
DECLARE
  v_sri_rahayu_id UUID;
  v_budi_santoso_id UUID;
  v_ani_yulianti_id UUID;

  -- Customer iteration
  v_customer RECORD;
  v_visit_date DATE;
  v_visit_id UUID;
  v_visit_count INTEGER;
  v_week_count INTEGER;
  v_days_array TEXT[];
  v_day TEXT;

  -- Payout calculation
  v_total_visits_sri_sept INTEGER := 0;
  v_total_visits_sri_oct INTEGER := 0;
  v_total_visits_budi_sept INTEGER := 0;
  v_total_visits_budi_oct INTEGER := 0;
  v_total_visits_ani_sept INTEGER := 0;
  v_total_visits_ani_oct INTEGER := 0;
  v_payout_id VARCHAR;
  v_price_per_visit DECIMAL := 150000;

BEGIN

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DYNAMIC VISIT & PAYOUT GENERATION';
  RAISE NOTICE 'Period: September - October 2025';
  RAISE NOTICE 'Mitras: Sri Rahayu, Budi Santoso, Ani Yulianti';
  RAISE NOTICE '========================================';

  -- Get Mitra IDs
  SELECT id INTO v_sri_rahayu_id FROM mitra_db WHERE mitra_code = 'MITRA-202510-011';
  SELECT id INTO v_budi_santoso_id FROM mitra_db WHERE mitra_code = 'MITRA-202501-002';
  SELECT id INTO v_ani_yulianti_id FROM mitra_db WHERE mitra_code = 'MITRA-202506-007';

  IF v_sri_rahayu_id IS NULL THEN
    RAISE NOTICE 'WARNING: Sri Rahayu (MITRA-202510-011) not found in database!';
  ELSE
    RAISE NOTICE 'Sri Rahayu ID: %', v_sri_rahayu_id;
  END IF;

  IF v_budi_santoso_id IS NULL THEN
    RAISE NOTICE 'WARNING: Budi Santoso (MITRA-202501-002) not found in database!';
  ELSE
    RAISE NOTICE 'Budi Santoso ID: %', v_budi_santoso_id;
  END IF;

  IF v_ani_yulianti_id IS NULL THEN
    RAISE NOTICE 'WARNING: Ani Yulianti (MITRA-202506-007) not found in database!';
  ELSE
    RAISE NOTICE 'Ani Yulianti ID: %', v_ani_yulianti_id;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '--- Processing Sri Rahayu Customers ---';

  -- =====================================================
  -- PROCESS SRI RAHAYU'S CUSTOMERS
  -- =====================================================

  FOR v_customer IN
    SELECT
      c.id,
      c.customer_name,
      c.chosen_days,
      c.subscription_package,
      c.subscription_status
    FROM customer_db c
    WHERE c.assigned_mitra_id = v_sri_rahayu_id
      AND c.is_active = true
      AND c.subscription_status = 'Active'
  LOOP

    RAISE NOTICE 'Customer: % (Package: %)', v_customer.customer_name, v_customer.subscription_package;
    RAISE NOTICE '  Days: %', v_customer.chosen_days;

    -- Parse chosen days (format: "Monday,Thursday" or "Monday,Wednesday,Friday")
    IF v_customer.chosen_days IS NOT NULL AND v_customer.chosen_days != '' THEN
      v_days_array := string_to_array(v_customer.chosen_days, ',');

      -- Generate visits for September 2025
      v_visit_count := 0;
      FOR v_week_count IN 0..3 LOOP  -- 4 weeks in September
        FOREACH v_day IN ARRAY v_days_array LOOP
          v_visit_date := (
            DATE '2025-09-01' + (v_week_count * 7) +
            CASE TRIM(v_day)
              WHEN 'Monday' THEN 0
              WHEN 'Tuesday' THEN 1
              WHEN 'Wednesday' THEN 2
              WHEN 'Thursday' THEN 3
              WHEN 'Friday' THEN 4
              WHEN 'Saturday' THEN 5
              WHEN 'Sunday' THEN 6
              ELSE 0
            END
          );

          -- Only create if within September
          IF v_visit_date >= '2025-09-01' AND v_visit_date < '2025-10-01' THEN
            v_visit_count := v_visit_count + 1;
            v_visit_id := gen_random_uuid();

            INSERT INTO visit_db (
              id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
              visit_number, scheduled_date, scheduled_day, actual_date,
              status, duration_hours, created_at, updated_at, completed_at
            ) VALUES (
              v_visit_id,
              v_customer.id,
              v_sri_rahayu_id,
              v_sri_rahayu_id,
              v_sri_rahayu_id,
              v_visit_count,
              v_visit_date,
              TO_CHAR(v_visit_date, 'Day'),
              v_visit_date,
              'Done',
              3,
              NOW(),
              NOW(),
              v_visit_date + INTERVAL '3 hours'
            );

            v_total_visits_sri_sept := v_total_visits_sri_sept + 1;
          END IF;
        END LOOP;
      END LOOP;

      -- Generate visits for October 2025
      FOR v_week_count IN 0..4 LOOP  -- 5 weeks in October
        FOREACH v_day IN ARRAY v_days_array LOOP
          v_visit_date := (
            DATE '2025-10-01' + (v_week_count * 7) +
            CASE TRIM(v_day)
              WHEN 'Monday' THEN 0
              WHEN 'Tuesday' THEN 1
              WHEN 'Wednesday' THEN 2
              WHEN 'Thursday' THEN 3
              WHEN 'Friday' THEN 4
              WHEN 'Saturday' THEN 5
              WHEN 'Sunday' THEN 6
              ELSE 0
            END
          );

          -- Only create if within October
          IF v_visit_date >= '2025-10-01' AND v_visit_date < '2025-11-01' THEN
            v_visit_count := v_visit_count + 1;
            v_visit_id := gen_random_uuid();

            INSERT INTO visit_db (
              id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
              visit_number, scheduled_date, scheduled_day, actual_date,
              status, duration_hours, created_at, updated_at, completed_at
            ) VALUES (
              v_visit_id,
              v_customer.id,
              v_sri_rahayu_id,
              v_sri_rahayu_id,
              v_sri_rahayu_id,
              v_visit_count,
              v_visit_date,
              TO_CHAR(v_visit_date, 'Day'),
              v_visit_date,
              'Done',
              3,
              NOW(),
              NOW(),
              v_visit_date + INTERVAL '3 hours'
            );

            v_total_visits_sri_oct := v_total_visits_sri_oct + 1;
          END IF;
        END LOOP;
      END LOOP;

      RAISE NOTICE '  Created visits: Sept (%), Oct (%)',
        (SELECT COUNT(*) FROM visit_db WHERE customer_id = v_customer.id AND actual_date >= '2025-09-01' AND actual_date < '2025-10-01'),
        (SELECT COUNT(*) FROM visit_db WHERE customer_id = v_customer.id AND actual_date >= '2025-10-01' AND actual_date < '2025-11-01');
    ELSE
      RAISE NOTICE '  SKIPPED: No chosen_days defined';
    END IF;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '--- Processing Budi Santoso Customers ---';

  -- =====================================================
  -- PROCESS BUDI SANTOSO'S CUSTOMERS
  -- =====================================================

  FOR v_customer IN
    SELECT
      c.id,
      c.customer_name,
      c.chosen_days,
      c.subscription_package,
      c.subscription_status
    FROM customer_db c
    WHERE c.assigned_mitra_id = v_budi_santoso_id
      AND c.is_active = true
      AND c.subscription_status = 'Active'
  LOOP

    RAISE NOTICE 'Customer: % (Package: %)', v_customer.customer_name, v_customer.subscription_package;
    RAISE NOTICE '  Days: %', v_customer.chosen_days;

    -- Parse chosen days
    IF v_customer.chosen_days IS NOT NULL AND v_customer.chosen_days != '' THEN
      v_days_array := string_to_array(v_customer.chosen_days, ',');

      -- Generate visits for September 2025
      v_visit_count := 0;
      FOR v_week_count IN 0..3 LOOP
        FOREACH v_day IN ARRAY v_days_array LOOP
          v_visit_date := (
            DATE '2025-09-01' + (v_week_count * 7) +
            CASE TRIM(v_day)
              WHEN 'Monday' THEN 0
              WHEN 'Tuesday' THEN 1
              WHEN 'Wednesday' THEN 2
              WHEN 'Thursday' THEN 3
              WHEN 'Friday' THEN 4
              WHEN 'Saturday' THEN 5
              WHEN 'Sunday' THEN 6
              ELSE 0
            END
          );

          IF v_visit_date >= '2025-09-01' AND v_visit_date < '2025-10-01' THEN
            v_visit_count := v_visit_count + 1;
            v_visit_id := gen_random_uuid();

            INSERT INTO visit_db (
              id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
              visit_number, scheduled_date, scheduled_day, actual_date,
              status, duration_hours, created_at, updated_at, completed_at
            ) VALUES (
              v_visit_id,
              v_customer.id,
              v_budi_santoso_id,
              v_budi_santoso_id,
              v_budi_santoso_id,
              v_visit_count,
              v_visit_date,
              TO_CHAR(v_visit_date, 'Day'),
              v_visit_date,
              'Done',
              3,
              NOW(),
              NOW(),
              v_visit_date + INTERVAL '3 hours'
            );

            v_total_visits_budi_sept := v_total_visits_budi_sept + 1;
          END IF;
        END LOOP;
      END LOOP;

      -- Generate visits for October 2025
      FOR v_week_count IN 0..4 LOOP
        FOREACH v_day IN ARRAY v_days_array LOOP
          v_visit_date := (
            DATE '2025-10-01' + (v_week_count * 7) +
            CASE TRIM(v_day)
              WHEN 'Monday' THEN 0
              WHEN 'Tuesday' THEN 1
              WHEN 'Wednesday' THEN 2
              WHEN 'Thursday' THEN 3
              WHEN 'Friday' THEN 4
              WHEN 'Saturday' THEN 5
              WHEN 'Sunday' THEN 6
              ELSE 0
            END
          );

          IF v_visit_date >= '2025-10-01' AND v_visit_date < '2025-11-01' THEN
            v_visit_count := v_visit_count + 1;
            v_visit_id := gen_random_uuid();

            INSERT INTO visit_db (
              id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
              visit_number, scheduled_date, scheduled_day, actual_date,
              status, duration_hours, created_at, updated_at, completed_at
            ) VALUES (
              v_visit_id,
              v_customer.id,
              v_budi_santoso_id,
              v_budi_santoso_id,
              v_budi_santoso_id,
              v_visit_count,
              v_visit_date,
              TO_CHAR(v_visit_date, 'Day'),
              v_visit_date,
              'Done',
              3,
              NOW(),
              NOW(),
              v_visit_date + INTERVAL '3 hours'
            );

            v_total_visits_budi_oct := v_total_visits_budi_oct + 1;
          END IF;
        END LOOP;
      END LOOP;

      RAISE NOTICE '  Created visits: Sept (%), Oct (%)',
        (SELECT COUNT(*) FROM visit_db WHERE customer_id = v_customer.id AND actual_date >= '2025-09-01' AND actual_date < '2025-10-01'),
        (SELECT COUNT(*) FROM visit_db WHERE customer_id = v_customer.id AND actual_date >= '2025-10-01' AND actual_date < '2025-11-01');
    ELSE
      RAISE NOTICE '  SKIPPED: No chosen_days defined';
    END IF;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '--- Processing Ani Yulianti Customers ---';

  -- =====================================================
  -- PROCESS ANI YULIANTI'S CUSTOMERS
  -- =====================================================

  FOR v_customer IN
    SELECT
      c.id,
      c.customer_name,
      c.chosen_days,
      c.subscription_package,
      c.subscription_status
    FROM customer_db c
    WHERE c.assigned_mitra_id = v_ani_yulianti_id
      AND c.is_active = true
      AND c.subscription_status = 'Active'
  LOOP

    RAISE NOTICE 'Customer: % (Package: %)', v_customer.customer_name, v_customer.subscription_package;
    RAISE NOTICE '  Days: %', v_customer.chosen_days;

    -- Parse chosen days
    IF v_customer.chosen_days IS NOT NULL AND v_customer.chosen_days != '' THEN
      v_days_array := string_to_array(v_customer.chosen_days, ',');

      -- Generate visits for September 2025
      v_visit_count := 0;
      FOR v_week_count IN 0..3 LOOP
        FOREACH v_day IN ARRAY v_days_array LOOP
          v_visit_date := (
            DATE '2025-09-01' + (v_week_count * 7) +
            CASE TRIM(v_day)
              WHEN 'Monday' THEN 0
              WHEN 'Tuesday' THEN 1
              WHEN 'Wednesday' THEN 2
              WHEN 'Thursday' THEN 3
              WHEN 'Friday' THEN 4
              WHEN 'Saturday' THEN 5
              WHEN 'Sunday' THEN 6
              ELSE 0
            END
          );

          IF v_visit_date >= '2025-09-01' AND v_visit_date < '2025-10-01' THEN
            v_visit_count := v_visit_count + 1;
            v_visit_id := gen_random_uuid();

            INSERT INTO visit_db (
              id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
              visit_number, scheduled_date, scheduled_day, actual_date,
              status, duration_hours, created_at, updated_at, completed_at
            ) VALUES (
              v_visit_id,
              v_customer.id,
              v_ani_yulianti_id,
              v_ani_yulianti_id,
              v_ani_yulianti_id,
              v_visit_count,
              v_visit_date,
              TO_CHAR(v_visit_date, 'Day'),
              v_visit_date,
              'Done',
              3,
              NOW(),
              NOW(),
              v_visit_date + INTERVAL '3 hours'
            );

            v_total_visits_ani_sept := v_total_visits_ani_sept + 1;
          END IF;
        END LOOP;
      END LOOP;

      -- Generate visits for October 2025
      FOR v_week_count IN 0..4 LOOP
        FOREACH v_day IN ARRAY v_days_array LOOP
          v_visit_date := (
            DATE '2025-10-01' + (v_week_count * 7) +
            CASE TRIM(v_day)
              WHEN 'Monday' THEN 0
              WHEN 'Tuesday' THEN 1
              WHEN 'Wednesday' THEN 2
              WHEN 'Thursday' THEN 3
              WHEN 'Friday' THEN 4
              WHEN 'Saturday' THEN 5
              WHEN 'Sunday' THEN 6
              ELSE 0
            END
          );

          IF v_visit_date >= '2025-10-01' AND v_visit_date < '2025-11-01' THEN
            v_visit_count := v_visit_count + 1;
            v_visit_id := gen_random_uuid();

            INSERT INTO visit_db (
              id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
              visit_number, scheduled_date, scheduled_day, actual_date,
              status, duration_hours, created_at, updated_at, completed_at
            ) VALUES (
              v_visit_id,
              v_customer.id,
              v_ani_yulianti_id,
              v_ani_yulianti_id,
              v_ani_yulianti_id,
              v_visit_count,
              v_visit_date,
              TO_CHAR(v_visit_date, 'Day'),
              v_visit_date,
              'Done',
              3,
              NOW(),
              NOW(),
              v_visit_date + INTERVAL '3 hours'
            );

            v_total_visits_ani_oct := v_total_visits_ani_oct + 1;
          END IF;
        END LOOP;
      END LOOP;

      RAISE NOTICE '  Created visits: Sept (%), Oct (%)',
        (SELECT COUNT(*) FROM visit_db WHERE customer_id = v_customer.id AND actual_date >= '2025-09-01' AND actual_date < '2025-10-01'),
        (SELECT COUNT(*) FROM visit_db WHERE customer_id = v_customer.id AND actual_date >= '2025-10-01' AND actual_date < '2025-11-01');
    ELSE
      RAISE NOTICE '  SKIPPED: No chosen_days defined';
    END IF;

  END LOOP;

  -- =====================================================
  -- CREATE PAYOUTS BASED ON ACTUAL COMPLETED VISITS
  -- =====================================================

  RAISE NOTICE '';
  RAISE NOTICE '--- Creating Payouts ---';

  -- Sri Rahayu - September 2025 (WITH BONUS)
  IF v_total_visits_sri_sept > 0 THEN
    v_payout_id := 'PAY/Sri-Rahayu/2025.09.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');

    INSERT INTO payout_db (
      payout_id, mitra_id, year, month, payout_date,
      total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
      status, bonus_eligible, notes, created_at, updated_at
    ) VALUES (
      v_payout_id,
      v_sri_rahayu_id,
      2025,
      9,
      '2025-09-30',
      v_total_visits_sri_sept,
      v_price_per_visit,
      v_total_visits_sri_sept * v_price_per_visit,
      500000,  -- Bonus
      (v_total_visits_sri_sept * v_price_per_visit) + 500000,
      'Paid',
      true,
      'Excellent performance - September 2025',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Sri Rahayu - September: % visits, Base: Rp %, Bonus: Rp 500K, Total: Rp %',
      v_total_visits_sri_sept,
      v_total_visits_sri_sept * v_price_per_visit,
      (v_total_visits_sri_sept * v_price_per_visit) + 500000;
  END IF;

  -- Sri Rahayu - October 2025 (WITH BONUS)
  IF v_total_visits_sri_oct > 0 THEN
    v_payout_id := 'PAY/Sri-Rahayu/2025.10.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');

    INSERT INTO payout_db (
      payout_id, mitra_id, year, month, payout_date,
      total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
      status, bonus_eligible, notes, created_at, updated_at
    ) VALUES (
      v_payout_id,
      v_sri_rahayu_id,
      2025,
      10,
      '2025-10-31',
      v_total_visits_sri_oct,
      v_price_per_visit,
      v_total_visits_sri_oct * v_price_per_visit,
      750000,  -- Bonus
      (v_total_visits_sri_oct * v_price_per_visit) + 750000,
      'Paid',
      true,
      'Outstanding performance - October 2025',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Sri Rahayu - October: % visits, Base: Rp %, Bonus: Rp 750K, Total: Rp %',
      v_total_visits_sri_oct,
      v_total_visits_sri_oct * v_price_per_visit,
      (v_total_visits_sri_oct * v_price_per_visit) + 750000;
  END IF;

  -- Budi Santoso - September 2025 (WITH BONUS)
  IF v_total_visits_budi_sept > 0 THEN
    v_payout_id := 'PAY/Budi-Santoso/2025.09.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');

    INSERT INTO payout_db (
      payout_id, mitra_id, year, month, payout_date,
      total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
      status, bonus_eligible, notes, created_at, updated_at
    ) VALUES (
      v_payout_id,
      v_budi_santoso_id,
      2025,
      9,
      '2025-09-30',
      v_total_visits_budi_sept,
      v_price_per_visit,
      v_total_visits_budi_sept * v_price_per_visit,
      400000,  -- Bonus
      (v_total_visits_budi_sept * v_price_per_visit) + 400000,
      'Paid',
      true,
      'Great performance - September 2025',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Budi Santoso - September: % visits, Base: Rp %, Bonus: Rp 400K, Total: Rp %',
      v_total_visits_budi_sept,
      v_total_visits_budi_sept * v_price_per_visit,
      (v_total_visits_budi_sept * v_price_per_visit) + 400000;
  END IF;

  -- Budi Santoso - October 2025 (WITH BONUS)
  IF v_total_visits_budi_oct > 0 THEN
    v_payout_id := 'PAY/Budi-Santoso/2025.10.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');

    INSERT INTO payout_db (
      payout_id, mitra_id, year, month, payout_date,
      total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
      status, bonus_eligible, notes, created_at, updated_at
    ) VALUES (
      v_payout_id,
      v_budi_santoso_id,
      2025,
      10,
      '2025-10-31',
      v_total_visits_budi_oct,
      v_price_per_visit,
      v_total_visits_budi_oct * v_price_per_visit,
      600000,  -- Bonus
      (v_total_visits_budi_oct * v_price_per_visit) + 600000,
      'Paid',
      true,
      'Exceptional performance - October 2025',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Budi Santoso - October: % visits, Base: Rp %, Bonus: Rp 600K, Total: Rp %',
      v_total_visits_budi_oct,
      v_total_visits_budi_oct * v_price_per_visit,
      (v_total_visits_budi_oct * v_price_per_visit) + 600000;
  END IF;

  -- Ani Yulianti - September 2025 (NO BONUS - Not Eligible)
  IF v_total_visits_ani_sept > 0 THEN
    v_payout_id := 'PAY/Ani-Yulianti/2025.09.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');

    INSERT INTO payout_db (
      payout_id, mitra_id, year, month, payout_date,
      total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
      status, bonus_eligible, notes, created_at, updated_at
    ) VALUES (
      v_payout_id,
      v_ani_yulianti_id,
      2025,
      9,
      '2025-09-30',
      v_total_visits_ani_sept,
      v_price_per_visit,
      v_total_visits_ani_sept * v_price_per_visit,
      0,  -- NO BONUS - Not Eligible
      v_total_visits_ani_sept * v_price_per_visit,
      'Paid',
      false,
      'Standard payout - Not eligible for bonus',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Ani Yulianti - September: % visits, Base: Rp %, Bonus: Rp 0 (Not Eligible), Total: Rp %',
      v_total_visits_ani_sept,
      v_total_visits_ani_sept * v_price_per_visit,
      v_total_visits_ani_sept * v_price_per_visit;
  END IF;

  -- Ani Yulianti - October 2025 (NO BONUS - Not Eligible)
  IF v_total_visits_ani_oct > 0 THEN
    v_payout_id := 'PAY/Ani-Yulianti/2025.10.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');

    INSERT INTO payout_db (
      payout_id, mitra_id, year, month, payout_date,
      total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
      status, bonus_eligible, notes, created_at, updated_at
    ) VALUES (
      v_payout_id,
      v_ani_yulianti_id,
      2025,
      10,
      '2025-10-31',
      v_total_visits_ani_oct,
      v_price_per_visit,
      v_total_visits_ani_oct * v_price_per_visit,
      0,  -- NO BONUS - Not Eligible
      v_total_visits_ani_oct * v_price_per_visit,
      'Paid',
      false,
      'Standard payout - Not eligible for bonus',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Ani Yulianti - October: % visits, Base: Rp %, Bonus: Rp 0 (Not Eligible), Total: Rp %',
      v_total_visits_ani_oct,
      v_total_visits_ani_oct * v_price_per_visit,
      v_total_visits_ani_oct * v_price_per_visit;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPLETED SUCCESSFULLY!';
  RAISE NOTICE 'Sri Rahayu: Sept (%) + Oct (%) = % total visits',
    v_total_visits_sri_sept, v_total_visits_sri_oct,
    v_total_visits_sri_sept + v_total_visits_sri_oct;
  RAISE NOTICE 'Budi Santoso: Sept (%) + Oct (%) = % total visits',
    v_total_visits_budi_sept, v_total_visits_budi_oct,
    v_total_visits_budi_sept + v_total_visits_budi_oct;
  RAISE NOTICE 'Ani Yulianti: Sept (%) + Oct (%) = % total visits (NO BONUS)',
    v_total_visits_ani_sept, v_total_visits_ani_oct,
    v_total_visits_ani_sept + v_total_visits_ani_oct;
  RAISE NOTICE '========================================';

END $$;
