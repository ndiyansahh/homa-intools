-- =====================================================
-- COMPLETE SEED DATA FOR SRI RAHAYU & BUDI SANTOSO
-- Dynamic data including: Customers, Visits, and Payouts
-- =====================================================

-- This script assumes:
-- 1. Mitra data already seeded (Sri Rahayu: MITRA-202510-011, Budi Santoso: MITRA-202501-002)
-- 2. Subscription packages already exist
-- 3. Region data already exists

-- =====================================================
-- STEP 1: Get Mitra IDs for reference
-- =====================================================

DO $$
DECLARE
  v_sri_rahayu_id UUID;
  v_budi_santoso_id UUID;
  v_package_basic_id UUID;
  v_package_regular_id UUID;
  v_package_frequent_id UUID;

  -- Customer IDs
  v_customer_1_id UUID;
  v_customer_2_id UUID;
  v_customer_3_id UUID;
  v_customer_4_id UUID;
  v_customer_5_id UUID;
  v_customer_6_id UUID;
  v_customer_7_id UUID;
  v_customer_8_id UUID;

  -- Visit tracking
  v_visit_id UUID;
  v_visit_date DATE;
  v_visit_count INTEGER;

  -- Payout tracking
  v_total_visits_sri INTEGER;
  v_total_visits_budi INTEGER;
  v_payout_id VARCHAR;
BEGIN

  -- Get Mitra IDs
  SELECT id INTO v_sri_rahayu_id FROM mitra_db WHERE mitra_code = 'MITRA-202510-011';
  SELECT id INTO v_budi_santoso_id FROM mitra_db WHERE mitra_code = 'MITRA-202501-002';

  -- Get Subscription Package IDs
  SELECT id INTO v_package_basic_id FROM subscription_package_db WHERE subscription_package LIKE '%Basic%' LIMIT 1;
  SELECT id INTO v_package_regular_id FROM subscription_package_db WHERE subscription_package LIKE '%Regular%' LIMIT 1;
  SELECT id INTO v_package_frequent_id FROM subscription_package_db WHERE subscription_package LIKE '%Frequent%' LIMIT 1;

  RAISE NOTICE '=== Starting data seed for Sri Rahayu and Budi Santoso ===';
  RAISE NOTICE 'Sri Rahayu ID: %', v_sri_rahayu_id;
  RAISE NOTICE 'Budi Santoso ID: %', v_budi_santoso_id;

  -- =====================================================
  -- STEP 2: Create Customers for SRI RAHAYU (Bekasi Area)
  -- =====================================================

  RAISE NOTICE '--- Creating customers for Sri Rahayu ---';

  -- Customer 1: Mrs. Indah Permatasari (Kemang Pratama)
  v_customer_1_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_1_id,
    'Indah Permatasari',
    '081298765432',
    'Jl. Kemang Pratama Blok F No. 12, Rawalumbu',
    'Bekasi',
    'Kemang Pratama',
    'Rawalumbu',
    '17116',
    v_sri_rahayu_id,
    v_package_regular_id,
    'Regular Cleaning - 2x per week',
    '2024-08-01',
    '2025-08-01',
    'Active',
    1200000,
    4800000,
    0,
    'Monday,Thursday',
    '{"day1":"Monday","day2":"Thursday","day3":null}',
    16,
    32,
    true,
    false,
    '2024-08-01 10:00:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Indah Permatasari';

  -- Customer 2: Mr. Rizki Fahreza (Grand Wisata)
  v_customer_2_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_2_id,
    'Rizki Fahreza',
    '081234998877',
    'Grand Wisata Cluster Amsterdam Blok B2/15',
    'Bekasi',
    'Grand Wisata',
    'Lambangjaya',
    '17510',
    v_sri_rahayu_id,
    v_package_basic_id,
    'Basic Cleaning - 1x per week',
    '2024-09-15',
    '2025-09-15',
    'Active',
    600000,
    2400000,
    0,
    'Saturday',
    '{"day1":"Saturday","day2":null,"day3":null}',
    12,
    12,
    true,
    false,
    '2024-09-15 14:30:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Rizki Fahreza';

  -- Customer 3: Mrs. Dewi Anggraini (Cibubur)
  v_customer_3_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_3_id,
    'Dewi Anggraini',
    '082147896523',
    'Cibubur Country Blok AA No. 45',
    'Bekasi',
    'Cibubur',
    'Jatisampurna',
    '17433',
    v_sri_rahayu_id,
    v_package_frequent_id,
    'Frequent Cleaning - 3x per week',
    '2024-07-01',
    '2025-07-01',
    'Active',
    1800000,
    9000000,
    0,
    'Monday,Wednesday,Friday',
    '{"day1":"Monday","day2":"Wednesday","day3":"Friday"}',
    18,
    54,
    true,
    false,
    '2024-07-01 09:00:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Dewi Anggraini';

  -- Customer 4: Mr. Hendra Wijaya (Harapan Indah)
  v_customer_4_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_4_id,
    'Hendra Wijaya',
    '081355667788',
    'Perumahan Harapan Indah 2 Blok HK No. 78',
    'Bekasi',
    'Harapan Indah',
    'Pejuang',
    '17131',
    v_sri_rahayu_id,
    v_package_regular_id,
    'Regular Cleaning - 2x per week',
    '2024-10-01',
    '2025-10-01',
    'Active',
    1200000,
    3600000,
    0,
    'Tuesday,Friday',
    '{"day1":"Tuesday","day2":"Friday","day3":null}',
    14,
    28,
    true,
    false,
    '2024-10-01 11:15:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Hendra Wijaya';

  -- =====================================================
  -- STEP 3: Create Customers for BUDI SANTOSO (Jakarta Selatan Area)
  -- =====================================================

  RAISE NOTICE '--- Creating customers for Budi Santoso ---';

  -- Customer 5: Mrs. Kartika Sari (Gandaria)
  v_customer_5_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_5_id,
    'Kartika Sari',
    '081267893456',
    'Jl. Gandaria Tengah III No. 28A',
    'Jakarta Selatan',
    'Gandaria',
    'Kramat Pela',
    '12140',
    v_budi_santoso_id,
    v_package_frequent_id,
    'Frequent Cleaning - 3x per week',
    '2024-06-01',
    '2025-06-01',
    'Active',
    1800000,
    10800000,
    0,
    'Monday,Wednesday,Friday',
    '{"day1":"Monday","day2":"Wednesday","day3":"Friday"}',
    19,
    57,
    true,
    false,
    '2024-06-01 08:30:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Kartika Sari';

  -- Customer 6: Mr. Ahmad Faisal (Cilandak)
  v_customer_6_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_6_id,
    'Ahmad Faisal',
    '082198765432',
    'Cilandak Town Square Apartment Tower B/1205',
    'Jakarta Selatan',
    'Cilandak',
    'Cilandak Barat',
    '12430',
    v_budi_santoso_id,
    v_package_basic_id,
    'Basic Cleaning - 1x per week',
    '2024-08-20',
    '2025-08-20',
    'Active',
    600000,
    2400000,
    0,
    'Sunday',
    '{"day1":"Sunday","day2":null,"day3":null}',
    15,
    15,
    true,
    false,
    '2024-08-20 13:45:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Ahmad Faisal';

  -- Customer 7: Mrs. Linda Kusuma (Lebak Bulus)
  v_customer_7_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_7_id,
    'Linda Kusuma',
    '081345678912',
    'Jl. Lebak Bulus Raya No. 156, Komplek Villa Cinere Mas',
    'Jakarta Selatan',
    'Lebak Bulus',
    'Lebak Bulus',
    '12440',
    v_budi_santoso_id,
    v_package_regular_id,
    'Regular Cleaning - 2x per week',
    '2024-07-10',
    '2025-07-10',
    'Active',
    1200000,
    6000000,
    0,
    'Tuesday,Thursday',
    '{"day1":"Tuesday","day2":"Thursday","day3":null}',
    17,
    34,
    true,
    false,
    '2024-07-10 10:20:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Linda Kusuma';

  -- Customer 8: Mr. Andi Nugroho (Kebayoran Baru)
  v_customer_8_id := gen_random_uuid();
  INSERT INTO customer_db (
    id, customer_name, contact, address, city, district, village, postal_code,
    assigned_mitra_id, subscription_package_id, subscription_package,
    subscription_start, subscription_end, subscription_status,
    monthly_fee, total_paid, outstanding_balance,
    chosen_days, day_pattern, ltv, total_sessions,
    is_active, is_deleted, created_at, updated_at
  ) VALUES (
    v_customer_8_id,
    'Andi Nugroho',
    '082156789034',
    'Jl. Senopati No. 89B, Kebayoran Baru',
    'Jakarta Selatan',
    'Kebayoran Baru',
    'Senopati',
    '12190',
    v_budi_santoso_id,
    v_package_regular_id,
    'Regular Cleaning - 2x per week',
    '2024-09-01',
    '2025-09-01',
    'Active',
    1200000,
    4800000,
    0,
    'Monday,Friday',
    '{"day1":"Monday","day2":"Friday","day3":null}',
    16,
    32,
    true,
    false,
    '2024-09-01 15:30:00',
    NOW()
  );
  RAISE NOTICE 'Created customer: Andi Nugroho';

  -- =====================================================
  -- STEP 4: Create VISITS for Sri Rahayu's Customers
  -- =====================================================

  RAISE NOTICE '--- Creating visits for Sri Rahayu customers ---';

  -- Visits for Indah Permatasari (2x per week: Monday, Thursday)
  -- August 2024 - 8 visits
  FOR v_visit_count IN 1..8 LOOP
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-08-' || LPAD((v_visit_count * 3 + 2)::text, 2, '0'))::DATE;

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_1_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
  END LOOP;

  -- September 2024 - 8 visits
  FOR v_visit_count IN 9..16 LOOP
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-09-' || LPAD(((v_visit_count - 8) * 3 + 1)::text, 2, '0'))::DATE;

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_1_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
  END LOOP;

  -- October 2024 - 8 visits
  FOR v_visit_count IN 17..24 LOOP
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-10-' || LPAD(((v_visit_count - 16) * 3 + 1)::text, 2, '0'))::DATE;

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_1_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
  END LOOP;

  -- November 2024 - 6 visits (Done) + 2 visits (Scheduled for future)
  FOR v_visit_count IN 25..32 LOOP
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-11-' || LPAD(((v_visit_count - 24) * 3 + 1)::text, 2, '0'))::DATE;

    IF v_visit_count <= 30 THEN
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_1_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSE
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at
      ) VALUES (
        v_visit_id, v_customer_1_id, v_sri_rahayu_id, v_sri_rahayu_id, NULL,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), NULL,
        'Scheduled', 3, NOW(), NOW()
      );
    END IF;
  END LOOP;
  RAISE NOTICE 'Created visits for Indah Permatasari: 32 visits';

  -- Visits for Rizki Fahreza (1x per week: Saturday) - Started Sept 15
  -- September 2024 - 2 visits
  v_visit_date := '2024-09-21'::DATE;
  FOR v_visit_count IN 1..2 LOOP
    v_visit_id := gen_random_uuid();

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_2_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, 'Saturday', v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
    v_visit_date := v_visit_date + INTERVAL '7 days';
  END LOOP;

  -- October 2024 - 4 visits
  FOR v_visit_count IN 3..6 LOOP
    v_visit_id := gen_random_uuid();

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_2_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, 'Saturday', v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
    v_visit_date := v_visit_date + INTERVAL '7 days';
  END LOOP;

  -- November 2024 - 4 visits (3 Done, 1 Scheduled)
  FOR v_visit_count IN 7..10 LOOP
    v_visit_id := gen_random_uuid();

    IF v_visit_count <= 9 THEN
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_2_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
        v_visit_count, v_visit_date, 'Saturday', v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSE
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at
      ) VALUES (
        v_visit_id, v_customer_2_id, v_sri_rahayu_id, v_sri_rahayu_id, NULL,
        v_visit_count, v_visit_date, 'Saturday', NULL,
        'Scheduled', 3, NOW(), NOW()
      );
    END IF;
    v_visit_date := v_visit_date + INTERVAL '7 days';
  END LOOP;
  RAISE NOTICE 'Created visits for Rizki Fahreza: 10 visits';

  -- Visits for Dewi Anggraini (3x per week: Mon, Wed, Fri) - Started July 1
  v_visit_count := 0;
  -- July 2024 - 13 visits
  FOR i IN 1..13 LOOP
    v_visit_count := v_visit_count + 1;
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-07-' || LPAD((i * 2 + 1)::text, 2, '0'))::DATE;

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_3_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
  END LOOP;

  -- August 2024 - 13 visits
  FOR i IN 1..13 LOOP
    v_visit_count := v_visit_count + 1;
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-08-' || LPAD((i * 2)::text, 2, '0'))::DATE;

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_3_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
  END LOOP;

  -- September & October 2024 - 26 visits total
  FOR i IN 1..26 LOOP
    v_visit_count := v_visit_count + 1;
    v_visit_id := gen_random_uuid();

    IF i <= 13 THEN
      v_visit_date := ('2024-09-' || LPAD((i * 2)::text, 2, '0'))::DATE;
    ELSE
      v_visit_date := ('2024-10-' || LPAD(((i - 13) * 2)::text, 2, '0'))::DATE;
    END IF;

    INSERT INTO visit_db (
      id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
      visit_number, scheduled_date, scheduled_day, actual_date,
      status, duration_hours, created_at, updated_at, completed_at
    ) VALUES (
      v_visit_id, v_customer_3_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
      v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
      'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
    );
  END LOOP;

  -- November 2024 - 10 visits (Done) + 3 (Scheduled)
  FOR i IN 1..13 LOOP
    v_visit_count := v_visit_count + 1;
    v_visit_id := gen_random_uuid();
    v_visit_date := ('2024-11-' || LPAD((i * 2)::text, 2, '0'))::DATE;

    IF i <= 10 THEN
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_3_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSE
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at
      ) VALUES (
        v_visit_id, v_customer_3_id, v_sri_rahayu_id, v_sri_rahayu_id, NULL,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), NULL,
        'Scheduled', 3, NOW(), NOW()
      );
    END IF;
  END LOOP;
  RAISE NOTICE 'Created visits for Dewi Anggraini: 75 visits';

  -- Visits for Hendra Wijaya (2x per week: Tue, Fri) - Started Oct 1
  v_visit_date := '2024-10-01'::DATE;
  FOR v_visit_count IN 1..16 LOOP
    v_visit_id := gen_random_uuid();

    IF v_visit_count <= 13 THEN
      -- October visits - Done
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_4_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSIF v_visit_count <= 15 THEN
      -- Early November - Done
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_4_id, v_sri_rahayu_id, v_sri_rahayu_id, v_sri_rahayu_id,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSE
      -- Future - Scheduled
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at
      ) VALUES (
        v_visit_id, v_customer_4_id, v_sri_rahayu_id, v_sri_rahayu_id, NULL,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), NULL,
        'Scheduled', 3, NOW(), NOW()
      );
    END IF;

    -- Increment by 3-4 days to simulate Tue/Fri pattern
    v_visit_date := v_visit_date + INTERVAL '3 days';
  END LOOP;
  RAISE NOTICE 'Created visits for Hendra Wijaya: 16 visits';

  -- =====================================================
  -- STEP 5: Create VISITS for Budi Santoso's Customers
  -- =====================================================

  RAISE NOTICE '--- Creating visits for Budi Santoso customers ---';

  -- Visits for Kartika Sari (3x per week: Mon, Wed, Fri) - Started June 1
  v_visit_count := 0;
  -- June-November 2024 (6 months × ~13 visits/month = ~78 visits)
  FOR month_offset IN 0..5 LOOP
    FOR i IN 1..13 LOOP
      v_visit_count := v_visit_count + 1;
      v_visit_id := gen_random_uuid();
      v_visit_date := ('2024-' || LPAD((6 + month_offset)::text, 2, '0') || '-' || LPAD((i * 2)::text, 2, '0'))::DATE;

      -- Last 3 visits scheduled
      IF v_visit_count <= 75 THEN
        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          visit_number, scheduled_date, scheduled_day, actual_date,
          status, duration_hours, created_at, updated_at, completed_at
        ) VALUES (
          v_visit_id, v_customer_5_id, v_budi_santoso_id, v_budi_santoso_id, v_budi_santoso_id,
          v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
          'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
        );
      ELSE
        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          visit_number, scheduled_date, scheduled_day, actual_date,
          status, duration_hours, created_at, updated_at
        ) VALUES (
          v_visit_id, v_customer_5_id, v_budi_santoso_id, v_budi_santoso_id, NULL,
          v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), NULL,
          'Scheduled', 3, NOW(), NOW()
        );
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Created visits for Kartika Sari: 78 visits';

  -- Visits for Ahmad Faisal (1x per week: Sunday) - Started Aug 20
  v_visit_date := '2024-08-25'::DATE;
  FOR v_visit_count IN 1..13 LOOP
    v_visit_id := gen_random_uuid();

    IF v_visit_count <= 11 THEN
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_6_id, v_budi_santoso_id, v_budi_santoso_id, v_budi_santoso_id,
        v_visit_count, v_visit_date, 'Sunday', v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSE
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at
      ) VALUES (
        v_visit_id, v_customer_6_id, v_budi_santoso_id, v_budi_santoso_id, NULL,
        v_visit_count, v_visit_date, 'Sunday', NULL,
        'Scheduled', 3, NOW(), NOW()
      );
    END IF;
    v_visit_date := v_visit_date + INTERVAL '7 days';
  END LOOP;
  RAISE NOTICE 'Created visits for Ahmad Faisal: 13 visits';

  -- Visits for Linda Kusuma (2x per week: Tue, Thu) - Started July 10
  v_visit_date := '2024-07-11'::DATE;
  v_visit_count := 0;

  FOR week_num IN 1..20 LOOP
    FOR day_in_week IN 1..2 LOOP
      v_visit_count := v_visit_count + 1;
      v_visit_id := gen_random_uuid();

      IF v_visit_count <= 36 THEN
        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          visit_number, scheduled_date, scheduled_day, actual_date,
          status, duration_hours, created_at, updated_at, completed_at
        ) VALUES (
          v_visit_id, v_customer_7_id, v_budi_santoso_id, v_budi_santoso_id, v_budi_santoso_id,
          v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
          'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
        );
      ELSE
        INSERT INTO visit_db (
          id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
          visit_number, scheduled_date, scheduled_day, actual_date,
          status, duration_hours, created_at, updated_at
        ) VALUES (
          v_visit_id, v_customer_7_id, v_budi_santoso_id, v_budi_santoso_id, NULL,
          v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), NULL,
          'Scheduled', 3, NOW(), NOW()
        );
      END IF;

      v_visit_date := v_visit_date + CASE WHEN day_in_week = 1 THEN INTERVAL '2 days' ELSE INTERVAL '5 days' END;

      EXIT WHEN v_visit_count >= 40;
    END LOOP;
    EXIT WHEN v_visit_count >= 40;
  END LOOP;
  RAISE NOTICE 'Created visits for Linda Kusuma: 40 visits';

  -- Visits for Andi Nugroho (2x per week: Mon, Fri) - Started Sept 1
  v_visit_date := '2024-09-02'::DATE;
  FOR v_visit_count IN 1..24 LOOP
    v_visit_id := gen_random_uuid();

    IF v_visit_count <= 20 THEN
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at, completed_at
      ) VALUES (
        v_visit_id, v_customer_8_id, v_budi_santoso_id, v_budi_santoso_id, v_budi_santoso_id,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), v_visit_date,
        'Done', 3, NOW(), NOW(), v_visit_date + INTERVAL '3 hours'
      );
    ELSE
      INSERT INTO visit_db (
        id, customer_id, mitra_id, original_mitra_id, actual_mitra_id,
        visit_number, scheduled_date, scheduled_day, actual_date,
        status, duration_hours, created_at, updated_at
      ) VALUES (
        v_visit_id, v_customer_8_id, v_budi_santoso_id, v_budi_santoso_id, NULL,
        v_visit_count, v_visit_date, TO_CHAR(v_visit_date, 'Day'), NULL,
        'Scheduled', 3, NOW(), NOW()
      );
    END IF;

    v_visit_date := v_visit_date + INTERVAL '3 days';
  END LOOP;
  RAISE NOTICE 'Created visits for Andi Nugroho: 24 visits';

  -- =====================================================
  -- STEP 6: Create PAYOUTS based on completed visits
  -- =====================================================

  RAISE NOTICE '--- Creating payouts ---';

  -- Calculate total visits for Sri Rahayu per month
  -- August 2024
  SELECT COUNT(*) INTO v_total_visits_sri
  FROM visit_db
  WHERE mitra_id = v_sri_rahayu_id
    AND status = 'Done'
    AND actual_date >= '2024-08-01'
    AND actual_date < '2024-09-01';

  v_payout_id := 'PAY/Sri-Rahayu/2024.08.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_sri_rahayu_id, 2024, 8, '2024-08-31',
    v_total_visits_sri, 150000, v_total_visits_sri * 150000, 500000, (v_total_visits_sri * 150000) + 500000,
    'Paid', true, 'Excellent performance - bonus for high customer satisfaction', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Sri Rahayu - August 2024: % visits, Total: Rp %', v_total_visits_sri, (v_total_visits_sri * 150000) + 500000;

  -- September 2024
  SELECT COUNT(*) INTO v_total_visits_sri
  FROM visit_db
  WHERE mitra_id = v_sri_rahayu_id
    AND status = 'Done'
    AND actual_date >= '2024-09-01'
    AND actual_date < '2024-10-01';

  v_payout_id := 'PAY/Sri-Rahayu/2024.09.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_sri_rahayu_id, 2024, 9, '2024-09-30',
    v_total_visits_sri, 150000, v_total_visits_sri * 150000, 300000, (v_total_visits_sri * 150000) + 300000,
    'Paid', true, 'Good performance - minor customer feedback', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Sri Rahayu - September 2024: % visits, Total: Rp %', v_total_visits_sri, (v_total_visits_sri * 150000) + 300000;

  -- October 2024
  SELECT COUNT(*) INTO v_total_visits_sri
  FROM visit_db
  WHERE mitra_id = v_sri_rahayu_id
    AND status = 'Done'
    AND actual_date >= '2024-10-01'
    AND actual_date < '2024-11-01';

  v_payout_id := 'PAY/Sri-Rahayu/2024.10.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_sri_rahayu_id, 2024, 10, '2024-10-31',
    v_total_visits_sri, 150000, v_total_visits_sri * 150000, 750000, (v_total_visits_sri * 150000) + 750000,
    'Paid', true, 'Outstanding! Bonus for new customer acquisition', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Sri Rahayu - October 2024: % visits, Total: Rp %', v_total_visits_sri, (v_total_visits_sri * 150000) + 750000;

  -- November 2024 (Pending - not yet paid)
  SELECT COUNT(*) INTO v_total_visits_sri
  FROM visit_db
  WHERE mitra_id = v_sri_rahayu_id
    AND status = 'Done'
    AND actual_date >= '2024-11-01'
    AND actual_date < '2024-12-01';

  v_payout_id := 'PAY/Sri-Rahayu/2024.11.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_sri_rahayu_id, 2024, 11, '2024-11-30',
    v_total_visits_sri, 150000, v_total_visits_sri * 150000, 0, v_total_visits_sri * 150000,
    'Pending', true, 'Awaiting approval', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Sri Rahayu - November 2024: % visits, Total: Rp %', v_total_visits_sri, v_total_visits_sri * 150000;

  -- Calculate total visits for Budi Santoso per month
  -- June 2024
  SELECT COUNT(*) INTO v_total_visits_budi
  FROM visit_db
  WHERE mitra_id = v_budi_santoso_id
    AND status = 'Done'
    AND actual_date >= '2024-06-01'
    AND actual_date < '2024-07-01';

  v_payout_id := 'PAY/Budi-Santoso/2024.06.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_budi_santoso_id, 2024, 6, '2024-06-30',
    v_total_visits_budi, 150000, v_total_visits_budi * 150000, 250000, (v_total_visits_budi * 150000) + 250000,
    'Paid', true, 'Solid performance', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Budi Santoso - June 2024: % visits, Total: Rp %', v_total_visits_budi, (v_total_visits_budi * 150000) + 250000;

  -- July 2024
  SELECT COUNT(*) INTO v_total_visits_budi
  FROM visit_db
  WHERE mitra_id = v_budi_santoso_id
    AND status = 'Done'
    AND actual_date >= '2024-07-01'
    AND actual_date < '2024-08-01';

  v_payout_id := 'PAY/Budi-Santoso/2024.07.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_budi_santoso_id, 2024, 7, '2024-07-31',
    v_total_visits_budi, 150000, v_total_visits_budi * 150000, 400000, (v_total_visits_budi * 150000) + 400000,
    'Paid', true, 'Great job! Customer retention bonus', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Budi Santoso - July 2024: % visits, Total: Rp %', v_total_visits_budi, (v_total_visits_budi * 150000) + 400000;

  -- August 2024
  SELECT COUNT(*) INTO v_total_visits_budi
  FROM visit_db
  WHERE mitra_id = v_budi_santoso_id
    AND status = 'Done'
    AND actual_date >= '2024-08-01'
    AND actual_date < '2024-09-01';

  v_payout_id := 'PAY/Budi-Santoso/2024.08.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_budi_santoso_id, 2024, 8, '2024-08-31',
    v_total_visits_budi, 150000, v_total_visits_budi * 150000, 600000, (v_total_visits_budi * 150000) + 600000,
    'Paid', true, 'Exceptional! New customer onboarding bonus', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Budi Santoso - August 2024: % visits, Total: Rp %', v_total_visits_budi, (v_total_visits_budi * 150000) + 600000;

  -- September 2024
  SELECT COUNT(*) INTO v_total_visits_budi
  FROM visit_db
  WHERE mitra_id = v_budi_santoso_id
    AND status = 'Done'
    AND actual_date >= '2024-09-01'
    AND actual_date < '2024-10-01';

  v_payout_id := 'PAY/Budi-Santoso/2024.09.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_budi_santoso_id, 2024, 9, '2024-09-30',
    v_total_visits_budi, 150000, v_total_visits_budi * 150000, 350000, (v_total_visits_budi * 150000) + 350000,
    'Paid', true, 'Consistent excellent service', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Budi Santoso - September 2024: % visits, Total: Rp %', v_total_visits_budi, (v_total_visits_budi * 150000) + 350000;

  -- October 2024
  SELECT COUNT(*) INTO v_total_visits_budi
  FROM visit_db
  WHERE mitra_id = v_budi_santoso_id
    AND status = 'Done'
    AND actual_date >= '2024-10-01'
    AND actual_date < '2024-11-01';

  v_payout_id := 'PAY/Budi-Santoso/2024.10.31-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_budi_santoso_id, 2024, 10, '2024-10-31',
    v_total_visits_budi, 150000, v_total_visits_budi * 150000, 450000, (v_total_visits_budi * 150000) + 450000,
    'Paid', true, 'Top performer of the month!', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Budi Santoso - October 2024: % visits, Total: Rp %', v_total_visits_budi, (v_total_visits_budi * 150000) + 450000;

  -- November 2024 (Pending)
  SELECT COUNT(*) INTO v_total_visits_budi
  FROM visit_db
  WHERE mitra_id = v_budi_santoso_id
    AND status = 'Done'
    AND actual_date >= '2024-11-01'
    AND actual_date < '2024-12-01';

  v_payout_id := 'PAY/Budi-Santoso/2024.11.30-' || LPAD(FLOOR(RANDOM() * 10000)::text, 5, '0');
  INSERT INTO payout_db (
    payout_id, mitra_id, year, month, payout_date,
    total_visits, price_per_visit, base_payout, bonus_amount, total_payout,
    status, bonus_eligible, notes, created_at, updated_at
  ) VALUES (
    v_payout_id, v_budi_santoso_id, 2024, 11, '2024-11-30',
    v_total_visits_budi, 150000, v_total_visits_budi * 150000, 0, v_total_visits_budi * 150000,
    'Pending', true, 'Awaiting approval', NOW(), NOW()
  );
  RAISE NOTICE 'Created payout for Budi Santoso - November 2024: % visits, Total: Rp %', v_total_visits_budi, v_total_visits_budi * 150000;

  RAISE NOTICE '=== SEED DATA COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Sri Rahayu: 4 customers, multiple visits, 4 payouts';
  RAISE NOTICE 'Budi Santoso: 4 customers, multiple visits, 6 payouts';

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify customers created
SELECT
  m.mitra_name,
  COUNT(c.id) as customer_count
FROM mitra_db m
LEFT JOIN customer_db c ON c.assigned_mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
GROUP BY m.mitra_name;

-- Verify visits created
SELECT
  m.mitra_name,
  v.status,
  COUNT(v.id) as visit_count,
  SUM(v.duration_hours) as total_hours
FROM mitra_db m
LEFT JOIN visit_db v ON v.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
GROUP BY m.mitra_name, v.status
ORDER BY m.mitra_name, v.status;

-- Verify payouts created
SELECT
  m.mitra_name,
  p.year,
  p.month,
  p.total_visits,
  p.base_payout,
  p.bonus_amount,
  p.total_payout,
  p.status
FROM mitra_db m
LEFT JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
ORDER BY m.mitra_name, p.year, p.month;

-- Summary report
SELECT
  m.mitra_name,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT v.id) as total_visits,
  COUNT(DISTINCT CASE WHEN v.status = 'Done' THEN v.id END) as completed_visits,
  COUNT(DISTINCT p.id) as total_payouts,
  COALESCE(SUM(p.total_payout), 0) as total_earnings
FROM mitra_db m
LEFT JOIN customer_db c ON c.assigned_mitra_id = m.id
LEFT JOIN visit_db v ON v.mitra_id = m.id
LEFT JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
GROUP BY m.mitra_name;
