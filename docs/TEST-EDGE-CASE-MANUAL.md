# 🧪 Manual Test Guide: Edge Case Yudhistira L

**Skenario**: Customer dengan subscription start tengah bulan (25-Dec-2025)
**Expected**: 2 rows di PDF payout (2 billing cycles dalam 1 payout month)
**Estimated Time**: ~15 minutes

---

## Prerequisites

✅ Dev server running di `http://localhost:3000`
✅ Login sebagai ADMIN atau OWNER

**Test Account**:
- Email: `admin@homa.com`
- Password: `admin123`

---

## Step 1: Setup Mitra (Atika Yunianti)

### Via UI:
1. Buka **http://localhost:3000/app/mitra**
2. Klik **"Add New Mitra"**
3. Isi form:
   ```
   Nama Mitra: Atika Yunianti
   NIK: 1234567890123456
   Gender: Female
   DOB: 01/01/1990
   Phone: 081512345678
   Bank Account: BCA
   Bank Account Number: 6801460001
   Bank Holder Name: Atika Yunianti
   Bonus Commission: Eligible
   ```
4. Klik **Save**
5. **Catat Mitra ID** (akan muncul di URL atau table)

### Alternatif: Pakai Mitra yang Sudah Ada
Kalau sudah ada mitra bernama "Atika Yunianti", bisa skip step ini.

---

## Step 2: Setup Rate Config untuk Mitra

1. Buka **http://localhost:3000/app/mitra**
2. Klik nama **"Atika Yunianti"** untuk masuk ke detail page
3. Di bagian **"Rate Configuration"**, tambah rate baru:
   ```
   Subscription Package: 4x/month (atau package dengan frekuensi 4x)
   Monthly Rate: 900000
   Effective From: 2025-12-01
   Status: Active
   ```
4. Klik **Save Rate**

---

## Step 3: Create Customer (Yudhistira L)

1. Buka **http://localhost:3000/app/customers**
2. Klik **"Add New Customer"**
3. Isi form:
   ```
   Customer Name: Yudhistira L
   Phone: 081598765432
   Address: Jakarta Selatan

   Subscription:
   - Package: 4x/month
   - Start Date: 2025-12-25  ⚠️ PENTING: Tanggal di tengah bulan!
   - End Date: 2026-12-24
   - Status: Active
   - Assigned Mitra: Atika Yunianti
   ```
4. Klik **Save**
5. **Catat Customer ID**

---

## Step 4: Create Visits (8 visits total)

Buka **http://localhost:3000/app/visits** (atau bisa dari customer detail page)

### Billing Cycle 1: 25-Dec-2025 ~ 24-Jan-2026

#### Visit 1 (Completed in December - NOT counted in Jan payout)
```
Customer: Yudhistira L
Mitra: Atika Yunianti
Scheduled Date: 2025-12-28
Status: Done
Completed At: 2025-12-28 10:00
```

#### Visit 2 (Completed in Jan ✅)
```
Customer: Yudhistira L
Mitra: Atika Yunianti
Scheduled Date: 2026-01-05
Status: Done
Completed At: 2026-01-05 10:00
```

#### Visit 3 (Completed in Jan ✅)
```
Customer: Yudhistira L
Mitra: Atika Yunianti
Scheduled Date: 2026-01-12
Status: Done
Completed At: 2026-01-12 10:00
```

#### Visit 4 (NOT completed ❌)
```
Customer: Yudhistira L
Mitra: Atika Yunianti
Scheduled Date: 2026-01-19
Status: Scheduled (jangan mark sebagai Done)
```

### Billing Cycle 2: 25-Jan-2026 ~ 24-Feb-2026

#### Visit 5 (Completed in Jan ✅)
```
Customer: Yudhistira L
Mitra: Atika Yunianti
Scheduled Date: 2026-01-26
Status: Done
Completed At: 2026-01-26 10:00
```

#### Visit 6-8 (Future visits - NOT completed)
```
Visit 6:
Scheduled Date: 2026-02-02
Status: Scheduled

Visit 7:
Scheduled Date: 2026-02-09
Status: Scheduled

Visit 8:
Scheduled Date: 2026-02-16
Status: Scheduled
```

---

## Step 5: Verify Visit Data

Buka **http://localhost:3000/app/visits** dan filter by **Customer: Yudhistira L**

Expected:
- ✅ **8 visits** total
- ✅ **3 visits** status Done dengan completedAt di January 2026:
  - Visit 2 (5-Jan)
  - Visit 3 (12-Jan)
  - Visit 5 (26-Jan)
- ✅ **1 visit** status Done di December 2025:
  - Visit 1 (28-Dec)
- ✅ **4 visits** status Scheduled:
  - Visit 4, 6, 7, 8

---

## Step 6: Generate Payout for January 2026

1. Buka **http://localhost:3000/app/payouts**
2. Set filter:
   ```
   Year: 2026
   Month: January
   ```
3. Klik **"Generate Payouts"**
4. Tunggu proses selesai (lihat console log untuk detail)

**Expected Console Log**:
```
📅 Yudhistira L: 2 billing cycle(s) in this payout month
📅   Billing cycle: 2025-12-25 to 2026-01-24
   ✓ Yudhistira L (4x/month): 2/4 visits × Rp900,000 = Rp450,000
📅   Billing cycle: 2026-01-25 to 2026-02-24
   ✓ Yudhistira L (4x/month): 1/4 visits × Rp900,000 = Rp225,000
```

---

## Step 7: Verify Payout Breakdown (Database)

Open terminal dan run:
```bash
psql "postgresql://handisulyansah@localhost:5432/homa_staging_test" -c "
SELECT
    payout_id,
    year,
    month,
    total_visits,
    base_payout,
    breakdown
FROM payout_db
WHERE year = 2026 AND month = 1
  AND mitra_id = (SELECT id FROM mitra_db WHERE mitra_name = 'Atika Yunianti')
LIMIT 1;
"
```

**Expected breakdown JSON**:
```json
{
  "customers": [
    {
      "customerName": "Yudhistira L",
      "billingCycleStart": "2025-12-25",
      "billingCycleEnd": "2026-01-24",
      "scheduledVisits": 4,
      "completedVisits": 2,
      "monthlyRate": 900000,
      "payout": 450000
    },
    {
      "customerName": "Yudhistira L",
      "billingCycleStart": "2026-01-25",
      "billingCycleEnd": "2026-02-24",
      "scheduledVisits": 4,
      "completedVisits": 1,
      "monthlyRate": 900000,
      "payout": 225000
    }
  ]
}
```

**Expected**:
- `total_visits`: 3
- `base_payout`: 675000 (450000 + 225000)

---

## Step 8: Download PDF & Verify

1. Di **http://localhost:3000/app/payouts**, find payout untuk "Atika Yunianti" bulan January 2026
2. Klik icon **Download PDF** (download icon di kolom Actions)
3. PDF akan ter-download otomatis

### Verify PDF Content:

**Expected Header**:
```
PT. HOMA MITRA ANDALAN
Office 8 - SCBD
...

Periode Pembayaran: December-2026
Nama Mitra: Atika Yunianti
...
```

**Expected Summary**:
```
Bonus                : IDR 0
Komisi Imbal Jasa    : IDR 675,000

Tunjangan Lainnya
  Uang Parkir        :
  Kompensasi Promosi Uji Coba : IDR 0

Total Pembayaran     : IDR 675,000
```

**Expected Customer Detail Table** (⚠️ CRITICAL CHECK):
```
┌──────────────┬────────────────────┬──────────────┬──────────────┬──────────────────────────┐
│ Nama         │ Komisi Imbal Jasa │ Tanggal Awal │ Tanggal Akhir│ Perhitungan Pro-Rata     │
│ Customers    │                    │              │              │                          │
├──────────────┼────────────────────┼──────────────┼──────────────┼──────────────────────────┤
│ Yudhistira L │ IDR 450,000        │ 25-Dec-2025  │ 24-Jan-2026  │ 2/4 Kedatangan (50%)     │
├──────────────┼────────────────────┼──────────────┼──────────────┼──────────────────────────┤
│ Yudhistira L │ IDR 225,000        │ 25-Jan-2026  │ 24-Feb-2026  │ 1/4 Kedatangan (25%)     │
├──────────────┼────────────────────┼──────────────┼──────────────┼──────────────────────────┤
│ Total        │ IDR 675,000        │              │              │                          │
└──────────────┴────────────────────┴──────────────┴──────────────┴──────────────────────────┘
```

**✅ SUCCESS CRITERIA**:
1. PDF shows **2 rows** for Yudhistira L ✅
2. Row 1: Billing cycle 25-Dec ~ 24-Jan, payout IDR 450,000 (50%) ✅
3. Row 2: Billing cycle 25-Jan ~ 24-Feb, payout IDR 225,000 (25%) ✅
4. Total: IDR 675,000 ✅
5. Format tanggal: "25-Dec-2025" ✅

---

## Troubleshooting

### Issue: Payout tidak muncul
- **Check**: Apakah ada visit dengan status "Done" di January 2026?
- **Check**: Apakah rate config sudah setup untuk package "4x/month"?

### Issue: Payout hanya muncul 1 row
- **Check**: Apakah Visit 5 (scheduled 26-Jan) sudah mark sebagai Done?
- **Check**: Billing cycle Visit 5 harus berbeda dengan Visit 2&3

### Issue: Perhitungan salah
- **Check**: Apakah subscription start date customer = 2025-12-25?
- **Check**: Console log saat generate payout untuk lihat detail perhitungan

---

## Next Steps

Setelah berhasil test edge case ini, kamu bisa test skenario lain:
- Customer dengan rate change di tengah bulan
- Customer dengan ganti mitra di tengah bulan
- Customer dengan multiple packages

---

**Happy Testing!** 🚀
