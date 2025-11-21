-- Create payout_db table
CREATE TABLE IF NOT EXISTS "payout_db" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "payout_id" VARCHAR(100) UNIQUE NOT NULL,
  "mitra_id" UUID NOT NULL REFERENCES "mitra_db"("id"),

  -- Period information
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "payout_date" DATE NOT NULL,

  -- Calculation details
  "total_visits" INTEGER DEFAULT 0,
  "price_per_visit" DECIMAL(10, 2) DEFAULT '0',
  "base_payout" DECIMAL(12, 2) DEFAULT '0',
  "bonus_amount" DECIMAL(10, 2) DEFAULT '0',
  "total_payout" DECIMAL(12, 2) DEFAULT '0',

  -- Status
  "status" VARCHAR(20) DEFAULT 'Pending',
  "bonus_eligible" BOOLEAN DEFAULT FALSE,

  -- Metadata
  "notes" TEXT,
  "paid_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_payout_mitra_id" ON "payout_db"("mitra_id");
CREATE INDEX IF NOT EXISTS "idx_payout_year_month" ON "payout_db"("year", "month");
CREATE INDEX IF NOT EXISTS "idx_payout_date" ON "payout_db"("payout_date");
