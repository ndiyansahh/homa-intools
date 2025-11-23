# Payout Data Deployment Guide

Deployment scripts untuk generate visits & payouts Sri Rahayu dan Budi Santoso (September - October 2025).

## 📁 Files Overview

| File | Purpose | Safe? |
|------|---------|-------|
| `seed-dynamic-visits-payout-2025.sql` | Generate visits & payouts (DYNAMIC) | ✅ READ existing customers |
| `show-payout-september-october.sql` | Display payout reports | ✅ READ ONLY |
| `deploy-payout-to-staging.sh` | Deploy to staging (with backup) | ⚠️ WRITES data |
| `verify-payout-staging.sh` | Verify deployment results | ✅ READ ONLY |
| `rollback-payout-staging.sh` | Remove deployed data | ⚠️ DELETES data |

---

## 🚀 Quick Start

### 1️⃣ Test di Local (RECOMMENDED)

```bash
# Check mitras exist
psql "postgresql://handisulyansah@localhost:5432/homa_staging_test" \
  -c "SELECT mitra_name, mitra_code FROM mitra_db WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002');"

# Run seed script
psql "postgresql://handisulyansah@localhost:5432/homa_staging_test" \
  -f seed-dynamic-visits-payout-2025.sql

# View results
psql "postgresql://handisulyansah@localhost:5432/homa_staging_test" \
  -f show-payout-september-october.sql
```

### 2️⃣ Deploy ke Staging (PRODUCTION)

```bash
# Make scripts executable
chmod +x deploy-payout-to-staging.sh
chmod +x verify-payout-staging.sh
chmod +x rollback-payout-staging.sh

# Deploy (with confirmation prompt)
./deploy-payout-to-staging.sh

# Verify deployment
./verify-payout-staging.sh

# If needed: Rollback
./rollback-payout-staging.sh
```

---

## 📊 What Gets Generated?

### Dynamic Data (based on EXISTING customers)

Script akan:
1. ✅ Baca customer yang **sudah assigned** ke Sri Rahayu & Budi Santoso
2. ✅ Parse `chosen_days` mereka (e.g., "Monday,Thursday")
3. ✅ Generate visits sesuai pattern di **Sept & Oct 2025**
4. ✅ Mark semua visits sebagai **"Done"**
5. ✅ Calculate payout otomatis dari completed visits

### Example Output (Local Test)

```
Sri Rahayu:
  - 1 customer: "test staging 2" (Monday only)
  - Sept 2025: 4 visits → Rp 1,100,000
  - Oct 2025: 5 visits → Rp 1,500,000

Budi Santoso:
  - 1 customer: "test-staging-add-new mitra" (Thursday only)
  - Sept 2025: 12 visits → Rp 2,200,000
  - Oct 2025: 15 visits → Rp 2,850,000
```

**Note:** Jumlah visits akan berbeda di staging tergantung customer yang sudah assigned!

---

## 🔍 Verification Queries

### Check Mitra Existence
```sql
SELECT mitra_name, mitra_code, status
FROM mitra_db
WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002');
```

### Check Customers Assigned
```sql
SELECT
  m.mitra_name,
  c.customer_name,
  c.chosen_days,
  c.subscription_status
FROM mitra_db m
JOIN customer_db c ON c.assigned_mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
  AND c.is_active = true;
```

### Check Generated Visits
```sql
SELECT
  m.mitra_name,
  DATE_TRUNC('month', v.actual_date) as month,
  COUNT(*) as total_visits,
  COUNT(CASE WHEN v.status = 'Done' THEN 1 END) as completed
FROM mitra_db m
JOIN visit_db v ON v.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
  AND v.actual_date >= '2025-09-01'
  AND v.actual_date < '2025-11-01'
GROUP BY m.mitra_name, DATE_TRUNC('month', v.actual_date);
```

### Check Payouts
```sql
SELECT
  m.mitra_name,
  p.month,
  p.year,
  p.total_visits,
  p.base_payout,
  p.bonus_amount,
  p.total_payout,
  p.status
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
  AND p.year = 2025
  AND p.month IN (9, 10);
```

---

## ⚠️ Safety Features

### Automatic Backup
`deploy-payout-to-staging.sh` automatically creates backup before deployment:
```
backup-staging-payout-20251123-143022.sql
```

### Confirmation Prompts
- Deploy script requires typing "yes"
- Rollback script requires typing "DELETE"

### Pre-deployment Checks
1. ✅ Verifies mitras exist
2. ✅ Shows customer count
3. ✅ Lists customers that will be affected

---

## 🔄 Rollback Process

If something goes wrong:

```bash
# Option 1: Use rollback script (deletes Sept-Oct 2025 data)
./rollback-payout-staging.sh

# Option 2: Manual rollback using SQL
psql "$NEON_URL" <<EOF
DELETE FROM payout_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
)
AND year = 2025 AND month IN (9, 10);

DELETE FROM visit_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
)
AND actual_date >= '2025-09-01'
AND actual_date < '2025-11-01';
EOF
```

---

## 🎯 Best Practices

### Before Deploying to Staging

1. ✅ **Test di local dulu**
   ```bash
   psql "postgresql://localhost/homa_staging_test" -f seed-dynamic-visits-payout-2025.sql
   ```

2. ✅ **Check customer data di staging**
   ```bash
   psql "$NEON_URL" -c "SELECT m.mitra_name, COUNT(c.id) FROM mitra_db m LEFT JOIN customer_db c ON c.assigned_mitra_id = m.id WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002') GROUP BY m.mitra_name;"
   ```

3. ✅ **Run deployment**
   ```bash
   ./deploy-payout-to-staging.sh
   ```

4. ✅ **Verify results**
   ```bash
   ./verify-payout-staging.sh
   ```

### After Deployment

1. Check payout totals match expected values
2. Verify all visits have `status = 'Done'`
3. Confirm customer visit patterns are correct
4. Review bonus amounts are reasonable

---

## 🐛 Troubleshooting

### Problem: "Mitras not found"
**Solution:** Run `seed-mitra-data.sql` first
```bash
psql "$NEON_URL" -f seed-mitra-data.sql
```

### Problem: "No customers assigned"
**Solution:** Assign customers to mitras first
```sql
UPDATE customer_db
SET assigned_mitra_id = (SELECT id FROM mitra_db WHERE mitra_code = 'MITRA-202510-011')
WHERE customer_name = 'Your Customer Name';
```

### Problem: "Visits not generating"
**Solution:** Check if customers have `chosen_days` defined
```sql
SELECT customer_name, chosen_days
FROM customer_db
WHERE assigned_mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
);
```

### Problem: "Script already ran, duplicate data"
**Solution:** Run rollback first, then re-run
```bash
./rollback-payout-staging.sh
./deploy-payout-to-staging.sh
```

---

## 📞 Support

For issues or questions:
1. Check verification queries above
2. Review script output for ERROR messages
3. Check backup file if rollback needed

---

## 🔐 Connection Strings

### Local
```
postgresql://handisulyansah@localhost:5432/homa_staging_test
```

### Staging (Neon)
```
postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require
```

**Note:** Credentials are stored in `drizzle.config.neon.ts`

---

## ✅ Success Criteria

Deployment is successful when:
- ✅ All customers have visits for Sept & Oct 2025
- ✅ All visits have `status = 'Done'`
- ✅ Payouts created for both months
- ✅ Visit counts match subscription patterns
- ✅ Total payout = (visits × Rp 150,000) + bonus

Example successful output:
```
Sri Rahayu - September: 4 visits, Total: Rp 1,100,000
Sri Rahayu - October: 5 visits, Total: Rp 1,500,000
Budi Santoso - September: 12 visits, Total: Rp 2,200,000
Budi Santoso - October: 15 visits, Total: Rp 2,850,000
```
