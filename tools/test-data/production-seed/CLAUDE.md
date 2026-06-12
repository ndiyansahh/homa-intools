# Production Seed — ETL Playbook

Dokumen ini adalah panduan untuk menjalankan ETL seed production untuk setiap Quarter.
Dibuat berdasarkan pengalaman Q1 2026. Untuk quarter berikutnya, ikuti pola yang sama.

---

## Free Trial Seed

### Phase 1 (2026 only)

Script untuk seed trial dari `free-trial-db.csv`, filter hanya tahun 2026:

```bash
npx tsx scripts/etl-free-trials-production.ts
```

**Source file:** `tools/test-data/production-seed/free-trial-db.csv`
**Filter:** Hanya row dengan First Trial atau Second Trial di tahun 2026.

---

### Phase 2 (Aug 2023 – sekarang)

Script all-in-one untuk seed trial customers dari historical data, **tanpa filter tahun**:

```bash
export DATABASE_URL='postgresql://homa_user:HomaDB2025Secure@localhost:5432/homa_production'
npx tsx scripts/etl-free-trials-phase2.ts
```

**Source files:**
- `tools/test-data/production-seed/phase2/trial-phase-2.csv` — ~724 rows trial customers
- `tools/test-data/production-seed/phase2/mitra-phase2.csv` — 137 mitras (master data terbaru)

**Yang dilakukan script (2 step otomatis):**
1. **Ensure mitras** — cek mitra mana yang belum ada di DB, insert dari `mitra-phase2.csv` beserta rate config-nya
2. **Seed customers** — insert trial customers, skip yang sudah ada (match by nama + contact)

**Yang di-insert ke `customer_db`:**
- `subscriptionPackage` = `'Trial'`
- `subscriptionStart` = tanggal First Trial
- `subscriptionEnd` = tanggal Second Trial (jika ada)
- `subscriptionStatus` = mapped dari kolom `Status` CSV (Converted / Not Converted / Cancelled / Trial)
- `assignedMitraId` = lookup by name dari `Mitra / Cleaner 1`
- `backupMitraIds` = lookup by name dari `Mitra / Cleaner 2`

**Idempotent:** Aman dijalankan ulang — skip jika customer dengan nama + contact yang sama sudah ada.

**Tidak membuat:** invoice, visit records.

**Known quirks di CSV phase 2:**
- Nama/contact multi-line (newline dalam quoted field) → script ambil baris pertama saja
- Contact dengan format `08xxx / 08xxx` → script ambil nomor pertama saja
- 3 mitra tidak ada di master CSV (`Murti Kurnia Sari`, `Siti`, `Sumarsih Anjani`) → customer tetap di-insert dengan `assignedMitraId = null`

**Hasil seed phase 2 (Jun 2026):**
- Inserted: 499 customers
- Mitra baru di-insert otomatis dari `mitra-phase2.csv`

---

### Phase 2 — Visit Records (Attendance)

Script untuk seed visit records dari attendance historical data phase 2:

```bash
export DATABASE_URL='postgresql://homa_user:HomaDB2025Secure@localhost:5432/homa_production'
npx tsx scripts/etl-visits-phase2.ts
```

**Source file:** `tools/test-data/production-seed/phase2/attendanced-phase-2.csv`

**Format:** Sama persis dengan Q1 attendance CSV (`invoice_number`, `mitra_1`, `visit_1..31`, `backup_mitra_1..31`).

**Behavior:**
- Lookup invoice by `invoice_number` → jika tidak ditemukan di DB, **di-skip** (bukan error) — akan jalan setelah ETL invoices dijalankan
- Lookup customer by `client_name` → skip jika tidak ditemukan
- Lookup mitra by kode diekstrak dari `Nama Mitra (MITRA-xxx)` format
- Normalisasi typo mitra code: `MITRA-2020501-xxx` → `MITRA-202501-xxx`
- Jika invoice sudah punya visits di DB → skip (idempotent)
- Backup mitra per visit: jika ada dan ditemukan di DB, dipakai sebagai `effectiveMitraId`

**Idempotent:** Aman dijalankan ulang — skip invoice yang sudah punya visits.

**Dependency:** Invoices harus sudah ada di DB terlebih dahulu (jalankan ETL invoices phase 2 dulu jika ada).

---

## Konsep & Filosofi

**Prinsip utama:** Seed hanya data yang **saling terhubung**. Customer tanpa invoice, mitra tanpa visit = orphan data yang merusak dashboard dan kalkulasi payout.

**Scope yang benar per quarter:**
- Mitras: hanya yang **muncul di attendance CSV** quarter tersebut
- Customers: hanya yang **muncul di invoice CSV** quarter tersebut
- Invoices: semua dari invoice CSV (termasuk CANCELLED — tetap insert, status = `Cancelled`)
- Visits: semua dari attendance CSV (termasuk yang off/sakit — tetap insert, status = `Cancelled`)

**`customer-db.csv`** bukan primary source — dipakai hanya sebagai **enrichment** (phone, city, district, dll) untuk customer yang ada di invoice.

---

## File CSV yang Dibutuhkan Per Quarter

Taruh di: `tools/test-data/production-seed/`

| File | Format | Keterangan |
|------|--------|------------|
| `invoice-QX-YYYY.csv` | Lihat contoh Q1 | Primary source customers & invoices |
| `attendance-QX-YYYY.csv` | Lihat contoh Q1 | Source visits + mitra assignments |
| `customer-db.csv` | Static — tidak berubah tiap quarter | Enrichment data (phone, address detail) |
| `mitra-db-production.csv` | Legacy — jangan dipakai lagi | Digantikan oleh `phase2/mitra-phase2.csv` |
| `phase2/mitra-phase2.csv` | **Active** — update jika ada mitra baru (137 mitras per Jun 2026) | Master data mitra terbaru untuk production |
| `mitra_db.csv` | Legacy — jangan dipakai lagi | Digantikan oleh `phase2/mitra-phase2.csv` |

### Format `invoice-QX-YYYY.csv`

Header (perhatikan typo pada kolom pertama — `Invoce No.` bukan `Invoice No.`):
```
Invoce No.        ,No,Date,YYYY,MM,DD,Subscription,Client Name,Address,Phone Num,
Type of Subscription,Qty,Price per Qty,Promo Code,Promo Discount,Start Period,End Period,Status,Payment Date
```

Key columns yang dipakai ETL:
- `Invoce No.        ` (trim!) → `invoiceNumber` (full format: `INV/Cleaning/2026.1.2-01469`)
- `No` → `invoiceNo` (integer sequence)
- `Date` → invoice date (`2-Jan-2026`)
- `YYYY`, `MM`, `DD` → `invoiceYears`, `invoiceMonths`, `invoiceDays`
- `Client Name` → match ke `customerDB.customerName`
- `Address` → `invoiceAddress`
- `Phone Num` → `invoicePhoneNumber`
- `Type of Subscription` → full package name, dipakai untuk lookup `subscriptionPackageDB`
- `Qty` → `invoiceQty`
- `Price per Qty` → `invoicePricePerQty` (format: `Rp  600,000` → strip jadi `600000`)
- `Promo Code` → `invoicePromoCode`
- `Promo Discount` → `invoicePromoDiscount` (format sama)
- `Start Period` → `invoiceStartDate`
- `End Period` → `invoiceEndDate`
- `Status` → `PAID` / `CANCELLED` / kosong (`Open`)
- `Payment Date` → `paidAt`

### Format `attendance-QX-YYYY.csv`

Header:
```
invoice_number,client_name,address,subscription_package,start_date,end-date,new_end_date,
mitra_1,day_1..day_7,visit_1..visit_31,backup_mitra_1..backup_mitra_31,total_visits
```

Key columns:
- `invoice_number` → FK ke invoiceDB
- `client_name` → FK ke customerDB
- `mitra_1` → format `Nama Mitra (MITRA-XXXXXX-XXXXXX)` — kode diekstrak dari dalam kurung
- `day_1..day_7` → hari kunjungan (Monday, Tuesday, dll)
- `visit_1..visit_31` → tanggal kunjungan, format `Day,D-Mon-YYYY` atau dengan cancel keyword
- `backup_mitra_1..backup_mitra_31` → mitra pengganti per visit (format sama dengan mitra_1)
- `total_visits` → cross-check saja, tidak di-insert langsung

### Cancel Keywords di Visit Column

Jika visit column mengandung salah satu keyword ini → status visit = `Cancelled`:
```
OFF, SAKIT, IZIN, MANGKIR, BANJIR, LIBUR, CUSTOMER
```

---

## Known Issues & Quirks

### 1. Typo Mitra Code di Attendance CSV

Attendance CSV punya typo pada mitra code format untuk mitra yang join 2025+:
- **Salah** (di CSV): `MITRA-2020501-000065` (ada extra `20`)
- **Benar** (di mitra_db & DB): `MITRA-202501-000065`

Pattern fix: `MITRA-202(0)(\d{3})` → `MITRA-202\2`

Semua script ETL visits harus normalisasi kode ini sebelum lookup ke DB.
Lihat fungsi `normalizeMitraCode()` di `etl-visits-production.ts`.

### 2. Kolom Header Punya Trailing Space

Kolom pertama invoice CSV: `'Invoce No.        '` (8 trailing spaces).
Selalu `.trim()` saat baca header.

### 3. Address Multi-line di CSV

Address bisa span multiple lines karena ada newline di dalam quoted field.
CSV parser harus handle quoted multi-line field — jangan pakai `split('\n')` biasa.
Lihat fungsi `parseCSV()` di script ETL untuk implementasi yang benar.

### 4. Package Name Mapping (attendance CSV)

Attendance CSV pakai nama pendek, invoice CSV pakai nama penuh:

| CSV attendance | Full package name |
|---|---|
| `Basic` | `Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)` |
| `Regular` | `Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)` |
| `Frequent` | `Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)` |

Invoice CSV sudah pakai full name — tidak perlu mapping.

### 5. Invoice Date vs Start Period

- `Date` di CSV = tanggal invoice diterbitkan → `invoiceDate`
- `Start Period` = tanggal mulai service → `invoiceStartDate`

Keduanya berbeda dan harus di-map dengan benar.

---

## Urutan Eksekusi ETL

**Wajib berurutan** (ada dependency FK antar tabel):

```bash
# Step 1 — Subscription Packages (tidak berubah tiap quarter)
npx tsx scripts/etl-packages-production.ts

# Step 2 — Mitras (hanya yang muncul di attendance quarter ini)
npx tsx scripts/etl-mitras-production.ts

# Step 3 — Customers (dari invoice CSV quarter ini, enriched dari customer-db.csv)
npx tsx scripts/etl-customers-production.ts

# Step 4 — Invoices (dari invoice CSV quarter ini)
npx tsx scripts/etl-invoices-production.ts

# Step 5 — Visits (dari attendance CSV quarter ini)
npx tsx scripts/etl-visits-production.ts
```

Semua script bersifat **idempotent** — aman dijalankan ulang, data existing akan di-skip.

---

## Cara Adaptasi untuk Quarter Baru

### 1. Siapkan CSV files

Taruh file baru di `tools/test-data/production-seed/`:
```
invoice-Q2-2026.csv
attendance-Q2-2026.csv
```
Format harus sama persis dengan Q1. Cek header columns.

### 2. Update path di 3 script

Setiap script yang membaca CSV punya konstanta path di bagian atas:

**`etl-mitras-production.ts`**
```typescript
// Ubah ini:
const ATTENDANCE_CSV = 'tools/test-data/production-seed/attendance-q1-2026.csv';
// Jadi:
const ATTENDANCE_CSV = 'tools/test-data/production-seed/attendance-Q2-2026.csv';
```

**`etl-customers-production.ts`**
```typescript
const INVOICE_CSV = 'tools/test-data/production-seed/invoice-q1-2026.csv';
// → invoice-Q2-2026.csv
```

**`etl-invoices-production.ts`**
```typescript
const INVOICE_CSV = 'tools/test-data/production-seed/invoice-q1-2026.csv';
// → invoice-Q2-2026.csv
```

**`etl-visits-production.ts`**
```typescript
const ATTENDANCE_CSV = 'tools/test-data/production-seed/attendance-q1-2026.csv';
// → attendance-Q2-2026.csv
```

### 3. Update mitra CSV jika ada mitra baru

Jika ada mitra bergabung di quarter baru, pastikan `mitra-db-production.csv` sudah updated sebelum run step 2. (`mitra_db.csv` sudah deprecated — jangan dipakai.)

### 4. Jalankan dan verifikasi

```bash
# Verifikasi count setelah tiap step
# Cek di output script: Inserted, Skipped, Errors

# Jika ada errors, cek:
# - Nama customer di attendance tidak match ke invoice? → typo di CSV
# - Mitra code tidak ditemukan? → mungkin mitra baru belum di mitra_db.csv
# - Invoice tidak ditemukan di step visits? → step 4 belum dijalankan
```

---

## Scope Data Q1 2026 (Referensi)

| Entity | Jumlah | Catatan |
|--------|--------|---------|
| Packages | 5 | 1 inactive (Special Partnership) |
| Mitras | 40 | Dari 40 unique mitra codes di attendance |
| Customers | 148 | Unique clients di invoice CSV |
| Invoices | 292 | Termasuk 2 CANCELLED |
| Visits | ~800+ | Estimasi dari 209 attendance rows × avg visits |

---

## Environment

Script dijalankan dari **root project** (`/var/www/homa-production` atau local):
```bash
# Pastikan .env.local ada dan DATABASE_URL mengarah ke DB yang benar
cat .env.local | grep DATABASE_URL

# Jalankan script
npx tsx scripts/etl-packages-production.ts
```

Untuk production VPS:
```bash
ssh root@194.233.68.67
cd /var/www/homa-production
# Pastikan branch main, sudah pull latest
npx tsx scripts/etl-packages-production.ts
```

---

## Checklist Sebelum Run

- [ ] CSV files sudah ada di `tools/test-data/production-seed/`
- [ ] Header CSV sudah sesuai format yang diharapkan
- [ ] `mitra_db.csv` sudah include mitra baru (jika ada)
- [ ] Path CSV di setiap script sudah diupdate ke quarter yang benar
- [ ] `DATABASE_URL` di `.env.local` mengarah ke **production** DB (bukan staging!)
- [ ] Backup database sudah dilakukan sebelum run
- [ ] Jalankan packages → mitras → customers → invoices → visits (berurutan)
