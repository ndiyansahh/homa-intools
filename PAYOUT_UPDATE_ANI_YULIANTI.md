# Update: Ani Yulianti Added (No Bonus)

## 🆕 What Changed?

Ditambahkan **Ani Yulianti** (MITRA-202506-007) ke seed script dengan ketentuan:

### **Bonus Policy:**
| Mitra | Bonus Eligible | Bonus Amount |
|-------|----------------|--------------|
| ✅ Sri Rahayu | **Yes** | Rp 500K - 750K |
| ✅ Budi Santoso | **Yes** | Rp 400K - 600K |
| ❌ Ani Yulianti | **NO** | **Rp 0** |

---

## 📁 Updated Files

### **1. seed-dynamic-visits-payout-2025-v2.sql** (NEW)
- Replaces: `seed-dynamic-visits-payout-2025.sql`
- Adds: Ani Yulianti processing
- Feature: **bonus_eligible = false, bonus_amount = 0** for Ani Yulianti

### **2. show-payout-september-october.sql** (UPDATED)
- Now includes: `MITRA-202506-007` in all queries
- New column: **"Eligible Bonus"** (Ya/Tidak)
- Shows: Bonus eligibility status clearly

---

## 🎯 How It Works

### Dynamic Processing for All 3 Mitras:

```sql
-- Sri Rahayu (MITRA-202510-011)
bonus_eligible: true
bonus_amount: Rp 500K - 750K

-- Budi Santoso (MITRA-202501-002)
bonus_eligible: true
bonus_amount: Rp 400K - 600K

-- Ani Yulianti (MITRA-202506-007)
bonus_eligible: false        ← NOT ELIGIBLE
bonus_amount: Rp 0           ← NO BONUS
```

### Example Payout Output:

```
Ani Yulianti - September: 10 visits
  Base: Rp 1,500,000
  Bonus: Rp 0 (Not Eligible)
  Total: Rp 1,500,000

Ani Yulianti - October: 12 visits
  Base: Rp 1,800,000
  Bonus: Rp 0 (Not Eligible)
  Total: Rp 1,800,000
```

---

## 🚀 Usage

### Test di Local:

```bash
# Run updated script v2
psql "postgresql://localhost/homa_staging_test" \
  -f seed-dynamic-visits-payout-2025-v2.sql

# View results (shows all 3 mitras)
psql "postgresql://localhost/homa_staging_test" \
  -f show-payout-september-october.sql
```

### Deploy ke Staging:

```bash
# Update deploy script to use v2
sed -i '' 's/seed-dynamic-visits-payout-2025.sql/seed-dynamic-visits-payout-2025-v2.sql/g' deploy-payout-to-staging.sh

# Deploy
./deploy-payout-to-staging.sh
```

---

## 📊 Query Examples

### Check Bonus Eligibility:

```sql
SELECT
  m.mitra_name,
  m.mitra_code,
  m.mitra_bonus_commission AS "Eligible per Master Data",
  p.bonus_eligible AS "Eligible in Payout",
  p.bonus_amount,
  p.total_payout
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.year = 2025
  AND p.month IN (9, 10);
```

### Compare Payouts (With vs Without Bonus):

```sql
SELECT
  m.mitra_name,
  SUM(p.total_visits) as total_visits,
  SUM(p.base_payout) as base_only,
  SUM(p.bonus_amount) as bonus_total,
  SUM(p.total_payout) as grand_total,
  CASE
    WHEN SUM(p.bonus_amount) > 0 THEN 'With Bonus'
    ELSE 'No Bonus'
  END as status
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.year = 2025
GROUP BY m.mitra_name;
```

**Expected Output:**

| Mitra | Total Visits | Base Only | Bonus Total | Grand Total | Status |
|-------|--------------|-----------|-------------|-------------|--------|
| Sri Rahayu | 9 | Rp 1.35M | Rp 1.25M | Rp 2.6M | **With Bonus** |
| Budi Santoso | 27 | Rp 4.05M | Rp 1M | Rp 5.05M | **With Bonus** |
| Ani Yulianti | 15 | Rp 2.25M | **Rp 0** | Rp 2.25M | **No Bonus** |

---

## ⚠️ Important Notes

### 1. Bonus Calculation Logic:

```plpgsql
-- In seed-dynamic-visits-payout-2025-v2.sql

-- For Sri Rahayu & Budi Santoso:
bonus_eligible: true
bonus_amount: 400000 - 750000  -- Based on performance

-- For Ani Yulianti:
bonus_eligible: false
bonus_amount: 0  -- HARDCODED to 0, regardless of performance
notes: 'Standard payout - Not eligible for bonus'
```

### 2. Database Field:

The `payout_db` table has:
- `bonus_eligible` (boolean) - Set to `false` for Ani Yulianti
- `bonus_amount` (decimal) - Set to `0` for Ani Yulianti
- `notes` (text) - Explains why no bonus

### 3. Report Visibility:

All payout reports now show:
- ✅ **"Eligible Bonus"** column (Ya/Tidak)
- ✅ Bonus amount (Rp 0 for Ani)
- ✅ Clear notes explaining status

---

## 🔍 Verification

### After running v2 script, verify:

```bash
# Check all 3 mitras processed
psql "$DB_URL" -c "
SELECT
  m.mitra_name,
  COUNT(DISTINCT p.id) as payout_count,
  SUM(p.total_visits) as total_visits,
  SUM(p.bonus_amount) as total_bonus,
  BOOL_AND(p.bonus_eligible) as all_eligible
FROM mitra_db m
LEFT JOIN payout_db p ON p.mitra_id = m.id
  AND p.year = 2025
  AND p.month IN (9, 10)
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
GROUP BY m.mitra_name;
"
```

**Expected Result:**
```
   mitra_name   | payout_count | total_visits | total_bonus | all_eligible
----------------+--------------+--------------+-------------+--------------
 Sri Rahayu     |            2 |            9 |     1250000 | t
 Budi Santoso   |            2 |           27 |     1000000 | t
 Ani Yulianti   |            2 |           15 |           0 | f  ← NO BONUS
```

---

## 📝 Migration from v1 to v2

If you already deployed v1 (without Ani Yulianti):

### Option 1: Add Ani's data only

```sql
-- Run only Ani Yulianti section manually
-- (extract from seed-dynamic-visits-payout-2025-v2.sql)
```

### Option 2: Rollback and re-run

```bash
# Rollback all Sept-Oct 2025 data
./rollback-payout-staging.sh

# Re-run with v2 (includes Ani)
psql "$DB_URL" -f seed-dynamic-visits-payout-2025-v2.sql
```

---

## ✅ Success Criteria

Deployment successful when:
- ✅ 3 mitras have payout records
- ✅ Ani Yulianti has `bonus_eligible = false`
- ✅ Ani Yulianti has `bonus_amount = 0`
- ✅ Sri Rahayu & Budi Santoso have bonuses
- ✅ Report shows "Eligible Bonus" column
- ✅ Notes explain bonus status

---

## 🔗 Related Files

- Main script: `seed-dynamic-visits-payout-2025-v2.sql`
- Query file: `show-payout-september-october.sql` (updated)
- Deploy script: `deploy-payout-to-staging.sh` (needs update to use v2)
- Rollback: `rollback-payout-staging.sh` (works with all versions)

---

## 💡 Key Difference from v1

| Feature | v1 | v2 |
|---------|----|----|
| Mitras | 2 (Sri, Budi) | **3 (+ Ani)** |
| Bonus for all | Yes | **No (Ani excluded)** |
| bonus_eligible flag | Not used | **Used for Ani** |
| Report columns | Basic | **+ Eligible Bonus** |

---

## 🎯 Next Steps

1. ✅ Test v2 di local - DONE
2. ⏳ Update deploy script to use v2
3. ⏳ Deploy to staging
4. ⏳ Verify Ani has no bonus in reports
5. ⏳ Confirm all 3 mitras shown correctly
