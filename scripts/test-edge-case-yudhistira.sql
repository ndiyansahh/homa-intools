-- ========================================
-- Test Edge Case: Yudhistira L
-- Customer dengan subscription start tengah bulan
-- Expected: 2 rows di PDF (2 billing cycles dalam 1 payout month)
-- ========================================

-- Step 1: Insert/Update Mitra (Atika Yunianti)
INSERT INTO mitra_db (
    id,
    mitra_code,
    mitra_name,
    mitra_nik,
    mitra_gender,
    mitra_dob,
    mitra_phone,
    mitra_bank_account,
    mitra_bank_account_number,
    mitra_bank_holder_name,
    mitra_bonus_commission,
    monthly_base_rate,
    bonus_rate,
    is_active,
    created_at,
    updated_at
) VALUES (
    'mitra-atika-test',
    'MITRA-2020505-000086',
    'Atika Yunianti',
    '1234567890123456',
    'Female',
    '1990-01-01',
    '081512345678',
    'BCA',
    '6801460001',
    'Atika Yunianti',
    'Eligible',
    '0',
    '0',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Step 2: Insert Customer (Yudhistira L)
INSERT INTO customer_db (
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    subscription_package_id,
    subscription_package,
    subscription_start,
    subscription_end,
    subscription_status,
    assigned_mitra_id,
    created_at,
    updated_at
) VALUES (
    'customer-yudhistira-test',
    'Yudhistira L',
    'yudhistira.test@example.com',
    '081598765432',
    'Jakarta Selatan',
    'pkg-4x-month',
    '4x/month',
    '2025-12-25',  -- Subscription start di tengah bulan!
    '2026-12-24',
    'Active',
    'mitra-atika-test',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    subscription_start = '2025-12-25',
    subscription_package = '4x/month',
    subscription_package_id = 'pkg-4x-month',
    assigned_mitra_id = 'mitra-atika-test',
    subscription_status = 'Active',
    updated_at = NOW();

-- Step 3: Setup Rate Config (Rp 900,000/month for 4x/month package)
INSERT INTO mitra_rate_config_db (
    id,
    mitra_id,
    subscription_package_id,
    monthly_rate,
    effective_from,
    effective_to,
    is_active,
    created_at,
    updated_at
) VALUES (
    'rate-atika-4xmonth-test',
    'mitra-atika-test',
    'pkg-4x-month',
    '900000',
    '2025-12-01',
    NULL,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    monthly_rate = '900000',
    is_active = true,
    updated_at = NOW();

-- Step 4: Delete existing visits for this customer (cleanup)
DELETE FROM visit_db WHERE customer_id = 'customer-yudhistira-test';

-- Step 5: Insert Visits - Billing Cycle 1 (25-Dec-2025 ~ 24-Jan-2026)
-- Visit 1: scheduled 28-Dec, completed in Dec (NOT counted in Jan payout)
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-1',
    'customer-yudhistira-test',
    'mitra-atika-test',
    'mitra-atika-test',
    '2025-12-28',
    '2025-12-28 10:00:00',
    'Done',
    NOW(),
    NOW()
);

-- Visit 2: scheduled 5-Jan, completed in Jan ✅
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-2',
    'customer-yudhistira-test',
    'mitra-atika-test',
    'mitra-atika-test',
    '2026-01-05',
    '2026-01-05 10:00:00',
    'Done',
    NOW(),
    NOW()
);

-- Visit 3: scheduled 12-Jan, completed in Jan ✅
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-3',
    'customer-yudhistira-test',
    'mitra-atika-test',
    'mitra-atika-test',
    '2026-01-12',
    '2026-01-12 10:00:00',
    'Done',
    NOW(),
    NOW()
);

-- Visit 4: scheduled 19-Jan, NOT completed ❌
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-4',
    'customer-yudhistira-test',
    'mitra-atika-test',
    NULL,
    '2026-01-19',
    NULL,
    'Scheduled',
    NOW(),
    NOW()
);

-- Step 6: Insert Visits - Billing Cycle 2 (25-Jan-2026 ~ 24-Feb-2026)
-- Visit 5: scheduled 26-Jan, completed in Jan ✅
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-5',
    'customer-yudhistira-test',
    'mitra-atika-test',
    'mitra-atika-test',
    '2026-01-26',
    '2026-01-26 10:00:00',
    'Done',
    NOW(),
    NOW()
);

-- Visit 6: scheduled 2-Feb, future
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-6',
    'customer-yudhistira-test',
    'mitra-atika-test',
    NULL,
    '2026-02-02',
    NULL,
    'Scheduled',
    NOW(),
    NOW()
);

-- Visit 7: scheduled 9-Feb, future
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-7',
    'customer-yudhistira-test',
    'mitra-atika-test',
    NULL,
    '2026-02-09',
    NULL,
    'Scheduled',
    NOW(),
    NOW()
);

-- Visit 8: scheduled 16-Feb, future
INSERT INTO visit_db (
    id,
    customer_id,
    assigned_mitra_id,
    actual_mitra_id,
    scheduled_date,
    completed_at,
    status,
    created_at,
    updated_at
) VALUES (
    'visit-yud-8',
    'customer-yudhistira-test',
    'mitra-atika-test',
    NULL,
    '2026-02-16',
    NULL,
    'Scheduled',
    NOW(),
    NOW()
);

-- Step 7: Cleanup existing payouts for Jan 2026 (untuk testing berulang)
DELETE FROM payout_db WHERE year = 2026 AND month = 1 AND mitra_id = 'mitra-atika-test';

-- ========================================
-- Setup Complete!
-- ========================================

-- Verify data
SELECT 'Customer' as entity, customer_name, subscription_start, subscription_package
FROM customer_db WHERE id = 'customer-yudhistira-test'
UNION ALL
SELECT 'Mitra' as entity, mitra_name, mitra_code, mitra_bank_account
FROM mitra_db WHERE id = 'mitra-atika-test'
UNION ALL
SELECT 'Rate Config' as entity, monthly_rate::text, effective_from::text, subscription_package_id
FROM mitra_rate_config_db WHERE id = 'rate-atika-4xmonth-test';

-- Verify visits
SELECT
    scheduled_date,
    status,
    completed_at,
    CASE
        WHEN scheduled_date BETWEEN '2025-12-25' AND '2026-01-24' THEN 'Cycle 1 (25-Dec ~ 24-Jan)'
        WHEN scheduled_date BETWEEN '2026-01-25' AND '2026-02-24' THEN 'Cycle 2 (25-Jan ~ 24-Feb)'
        ELSE 'Other'
    END as billing_cycle
FROM visit_db
WHERE customer_id = 'customer-yudhistira-test'
ORDER BY scheduled_date;

-- Expected Result Summary:
-- Billing Cycle 1: 2/4 visits completed in Jan (Visit 2, Visit 3) = Rp 450,000
-- Billing Cycle 2: 1/4 visits completed in Jan (Visit 5) = Rp 225,000
-- Total Payout: Rp 675,000
