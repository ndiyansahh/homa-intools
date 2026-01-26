-- Migration: Add Payout Adjustment table
-- Feature: 8b - Payout adjustment change for next period
-- Date: 2026-01-26
-- Description: Track adjustments to apply to next payout period when historical visits are edited

-- Create payout_adjustment_db table
CREATE TABLE IF NOT EXISTS payout_adjustment_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id VARCHAR(100) UNIQUE NOT NULL, -- ADJ/MitraName/YYYY.MM.DD-XXXXX

  -- Related payout records
  original_payout_id UUID REFERENCES payout_db(id), -- Payout that needs adjustment
  applied_payout_id UUID REFERENCES payout_db(id), -- Payout where adjustment was applied
  mitra_id UUID NOT NULL REFERENCES mitra_db(id),

  -- Adjustment details
  adjustment_amount NUMERIC(12, 2) NOT NULL, -- Positive = add, Negative = deduct
  adjustment_type VARCHAR(50) NOT NULL, -- OVERPAYMENT_DEDUCTION, UNDERPAYMENT_ADDITION, MANUAL_ADJUSTMENT

  -- Reason and context
  reason TEXT NOT NULL, -- Human-readable reason
  related_visit_id UUID REFERENCES visit_db(id), -- NULL if manual adjustment
  related_customer_id UUID REFERENCES customer_db(id), -- Customer involved

  -- Original vs corrected values (for audit trail)
  original_visits INTEGER, -- Original completed visits count
  corrected_visits INTEGER, -- Corrected visits count after edit
  original_payout NUMERIC(12, 2), -- Original payout amount
  corrected_payout NUMERIC(12, 2), -- Corrected payout amount

  -- Period information
  original_year INTEGER, -- Year of original payout
  original_month INTEGER, -- Month of original payout (1-12)
  applied_year INTEGER, -- Year where adjustment applied
  applied_month INTEGER, -- Month where adjustment applied

  -- Status
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPLIED, CANCELLED, REJECTED

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255), -- User who created this adjustment
  applied_at TIMESTAMP WITH TIME ZONE, -- When adjustment was applied
  approved_by VARCHAR(255), -- User who approved (if workflow needed)
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payout_adjustment_mitra_id ON payout_adjustment_db(mitra_id);
CREATE INDEX IF NOT EXISTS idx_payout_adjustment_original_payout_id ON payout_adjustment_db(original_payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_adjustment_applied_payout_id ON payout_adjustment_db(applied_payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_adjustment_status ON payout_adjustment_db(status);
CREATE INDEX IF NOT EXISTS idx_payout_adjustment_period ON payout_adjustment_db(applied_year, applied_month);
CREATE INDEX IF NOT EXISTS idx_payout_adjustment_visit ON payout_adjustment_db(related_visit_id);

-- Add comments for documentation
COMMENT ON TABLE payout_adjustment_db IS 'Tracks payout adjustments to be applied to next period when historical visits are edited (Feature 8b)';
COMMENT ON COLUMN payout_adjustment_db.adjustment_amount IS 'Positive values = addition, Negative values = deduction';
COMMENT ON COLUMN payout_adjustment_db.adjustment_type IS 'OVERPAYMENT_DEDUCTION: mitra was overpaid, UNDERPAYMENT_ADDITION: mitra was underpaid, MANUAL_ADJUSTMENT: manual bonus/penalty';
COMMENT ON COLUMN payout_adjustment_db.status IS 'PENDING: waiting to be applied, APPLIED: already applied to payout, CANCELLED: adjustment cancelled, REJECTED: adjustment rejected';
