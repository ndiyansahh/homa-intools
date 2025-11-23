# ✅ READY TO DEPLOY - Payout Data (3 Mitras)

## 📋 Pre-Deployment Checklist

- ✅ Script v2 created (includes Ani Yulianti)
- ✅ Query files updated (3 mitras)
- ✅ Deploy script updated to use v2
- ✅ Verify script updated (includes bonus check)
- ✅ Rollback script updated (all 3 mitras)
- ✅ Documentation complete
- ✅ Tested in local database

---

## 🎯 What Will Be Deployed

### **3 Mitras - September & October 2025**

| Mitra | Code | Bonus Eligible | Sept Bonus | Oct Bonus |
|-------|------|----------------|------------|-----------|
| **Sri Rahayu** | MITRA-202510-011 | ✅ Yes | Rp 500K | Rp 750K |
| **Budi Santoso** | MITRA-202501-002 | ✅ Yes | Rp 400K | Rp 600K |
| **Ani Yulianti** | MITRA-202506-007 | ❌ **NO** | **Rp 0** | **Rp 0** |

### **Key Feature:**
- Dynamic visit generation based on existing customers
- Automatic payout calculation
- **Ani Yulianti: NO BONUS** (bonus_eligible = false)

---

## 🚀 Deployment Steps

### **1. Quick Deploy (Recommended)**

```bash
# Navigate to project directory
cd /Users/handisulyansah/Documents/homa

# Run deployment script (includes all safety checks)
./deploy-payout-to-staging.sh
```

**What happens:**
1. ✅ Auto-backup existing data
2. ✅ Check 3 mitras exist
3. ✅ Show customers assigned
4. ✅ Confirmation prompt
5. ✅ Deploy v2 script
6. ✅ Success report

---

### **2. Manual Deploy (Advanced)**

```bash
# Direct SQL execution
psql "postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require" \
  -f seed-dynamic-visits-payout-2025-v2.sql
```

---

## ✅ Post-Deployment Verification

### **Step 1: Run Verify Script**

```bash
./verify-payout-staging.sh
```

**Expected Output:**
```
1. Checking Payout Records
   Mitra        | Month | Visits | Bonus      | Bonus Eligible
   -------------+-------+--------+------------+----------------
   Sri Rahayu   | 9     | 4-10   | Rp 500,000 | t
   Sri Rahayu   | 10    | 5-12   | Rp 750,000 | t
   Budi Santoso | 9     | 12-30  | Rp 400,000 | t
   Budi Santoso | 10    | 15-35  | Rp 600,000 | t
   Ani Yulianti | 9     | 5-15   | Rp 0       | f  ← NO BONUS
   Ani Yulianti | 10    | 6-18   | Rp 0       | f  ← NO BONUS
```

### **Step 2: View Detailed Report**

```bash
psql "$NEON_URL" -f show-payout-september-october.sql
```

### **Step 3: Manual Verification Queries**

```sql
-- Check bonus eligibility
SELECT
  m.mitra_name,
  p.month,
  p.bonus_eligible,
  p.bonus_amount,
  p.total_payout
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.year = 2025
  AND p.month IN (9, 10)
ORDER BY m.mitra_name, p.month;
```

**Success Criteria:**
- ✅ Ani Yulianti has `bonus_eligible = f` (false)
- ✅ Ani Yulianti has `bonus_amount = 0`
- ✅ Sri & Budi have `bonus_eligible = t` (true)
- ✅ Sri & Budi have `bonus_amount > 0`

---

## 🔄 If Something Goes Wrong

### **Option 1: Rollback Everything**

```bash
./rollback-payout-staging.sh
# Type: DELETE (when prompted)
```

This will:
- Delete all Sept-Oct 2025 visits
- Delete all Sept-Oct 2025 payouts
- For all 3 mitras

### **Option 2: Manual Rollback**

```bash
psql "$NEON_URL" <<EOF
DELETE FROM payout_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
)
AND year = 2025 AND month IN (9, 10);

DELETE FROM visit_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
)
AND actual_date >= '2025-09-01' AND actual_date < '2025-11-01';
EOF
```

---

## 📁 Files Overview

| File | Purpose | Updated? |
|------|---------|----------|
| `seed-dynamic-visits-payout-2025-v2.sql` | Main seed script | ✅ NEW (3 mitras) |
| `show-payout-september-october.sql` | Display reports | ✅ Updated |
| `deploy-payout-to-staging.sh` | Deploy automation | ✅ Updated to v2 |
| `verify-payout-staging.sh` | Post-deploy check | ✅ Updated (3 mitras) |
| `rollback-payout-staging.sh` | Emergency rollback | ✅ Updated (3 mitras) |
| `PAYOUT_UPDATE_ANI_YULIANTI.md` | Change documentation | ✅ NEW |
| `READY_TO_DEPLOY.md` | This file | ✅ NEW |

---

## 🔍 Common Issues & Solutions

### Issue 1: "Mitras not found"
**Solution:**
```bash
# Run mitra seed first
psql "$NEON_URL" -f seed-mitra-data.sql
```

### Issue 2: "No customers assigned to Ani"
**Expected:** This is normal! Script handles it gracefully.
- If Ani has no customers → No visits generated
- Payout will show 0 visits, 0 bonus, Rp 0 total

### Issue 3: "Duplicate payout records"
**Solution:**
```bash
# Rollback first, then re-run
./rollback-payout-staging.sh
./deploy-payout-to-staging.sh
```

### Issue 4: "Ani has bonus but shouldn't"
**Fix:**
```sql
-- Manually set Ani's bonus to 0
UPDATE payout_db
SET bonus_amount = 0,
    bonus_eligible = false,
    total_payout = base_payout,
    notes = 'Standard payout - Not eligible for bonus'
WHERE mitra_id = (SELECT id FROM mitra_db WHERE mitra_code = 'MITRA-202506-007')
  AND year = 2025
  AND month IN (9, 10);
```

---

## 📊 Expected Results (Based on Local Test)

### **Local Database Results:**
```
Sri Rahayu:
  - 1 customer: "test staging 2"
  - Sept: 4 visits → Rp 1,100,000 (base Rp 600K + bonus Rp 500K)
  - Oct: 5 visits → Rp 1,500,000 (base Rp 750K + bonus Rp 750K)

Budi Santoso:
  - 1 customer: "test-staging-add-new mitra"
  - Sept: 12 visits → Rp 2,200,000 (base Rp 1.8M + bonus Rp 400K)
  - Oct: 15 visits → Rp 2,850,000 (base Rp 2.25M + bonus Rp 600K)

Ani Yulianti:
  - 0 customers → 0 visits → Rp 0 total (NO BONUS)
```

**Note:** Staging results will vary based on actual customers assigned!

---

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All 3 mitras have payout records (if they have customers)
- ✅ Ani Yulianti: `bonus_eligible = false`
- ✅ Ani Yulianti: `bonus_amount = 0`
- ✅ Sri & Budi: `bonus_eligible = true`
- ✅ Sri & Budi: `bonus_amount > 0`
- ✅ All visits have `status = 'Done'`
- ✅ Visit counts match customer subscription patterns
- ✅ Report shows "Eligible Bonus" column

---

## 📞 Need Help?

1. Check verification output carefully
2. Review `PAYOUT_UPDATE_ANI_YULIANTI.md` for details
3. Check backup file: `backup-staging-payout-*.sql`
4. Use rollback script if needed

---

## 🔐 Connection String

**Staging (Neon):**
```
postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require
```

Stored in: `drizzle.config.neon.ts`

---

## ⏭️ Next Steps After Deployment

1. ✅ Run verify script
2. ✅ Check detailed reports
3. ✅ Confirm Ani has NO bonus
4. ✅ Share results with stakeholders
5. ✅ Keep backup file safe

---

## 🎉 Ready to Deploy!

**Everything is prepared and tested.**

To deploy now:
```bash
./deploy-payout-to-staging.sh
```

Good luck! 🚀
