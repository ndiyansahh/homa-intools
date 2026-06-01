---
name: project-production-db-state
description: Kolom yang di-add manual ke production DB saat seed Q1 2026 karena migration belum pernah dijalankan
metadata:
  type: project
---

Production DB (homa_production di VPS 194.233.68.67) memiliki schema gap vs staging — beberapa kolom di-add manual saat seed Q1 2026 (2026-06-01).

**Kolom yang di-add manual:**
- `mitra_db`: `trial_rate_per_visit numeric(10,2) DEFAULT 100000`, `monthly_base_rate numeric(10,2) DEFAULT 0`
- `mitra_rate_config_db`: `visits_per_week integer NOT NULL DEFAULT 1`, `payout_rate numeric(12,2) NOT NULL DEFAULT 0` + DROP NOT NULL pada `monthly_rate` dan `effective_from`
- `visit_db`: `updated_by uuid`
- `attendance_record_db`: `updated_by uuid`
- `subscription_package_db`: `is_active` via drizzle/0012_add_is_active_to_packages.sql

**Why:** Production DB fresh, migration files tidak di-run karena historical dan tidak sync dengan state DB. Hanya kolom yang dibutuhkan ETL yang di-add manual.

**How to apply:** Sebelum deploy fitur baru yang touch tabel-tabel ini, verifikasi dulu kolom sudah ada di production DB. Jangan jalankan migration files lama secara bulk — akan merusak data.
