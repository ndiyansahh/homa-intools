-- Invoice Database Table
-- Customer invoices and payment tracking

CREATE TABLE IF NOT EXISTS invoice_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Customer reference
    customer_id UUID NOT NULL REFERENCES customer_db(id),
    customer_name VARCHAR(255) NOT NULL,
    
    -- Invoice details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Financial details
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount DECIMAL(10,2) DEFAULT 0 CHECK (paid_amount >= 0),
    outstanding_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
    payment_method VARCHAR(50),
    payment_date DATE,
    payment_reference VARCHAR(100),
    
    -- Description
    description TEXT,
    invoice_notes TEXT,
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_invoice_dates CHECK (due_date >= invoice_date),
    CONSTRAINT valid_period_dates CHECK (period_end >= period_start),
    CONSTRAINT valid_payment_date CHECK (payment_date IS NULL OR payment_date >= invoice_date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoice_db(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoice_db(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoice_db(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON invoice_db(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice_db(status);
CREATE INDEX IF NOT EXISTS idx_invoice_period ON invoice_db(period_start, period_end);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_db_updated_at ON invoice_db;
CREATE TRIGGER trigger_update_invoice_db_updated_at
    BEFORE UPDATE ON invoice_db
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_db_updated_at();

-- Trigger for auto-calculating outstanding amount
CREATE OR REPLACE FUNCTION calculate_invoice_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.outstanding_amount = NEW.total_amount - COALESCE(NEW.paid_amount, 0);
    
    -- Auto-update status based on payment
    IF NEW.outstanding_amount <= 0 THEN
        NEW.status = 'Paid';
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.outstanding_amount > 0 THEN
        NEW.status = 'Overdue';
    ELSIF NEW.outstanding_amount > 0 THEN
        NEW.status = 'Pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_invoice_outstanding_amount ON invoice_db;
CREATE TRIGGER trigger_calculate_invoice_outstanding_amount
    BEFORE INSERT OR UPDATE ON invoice_db
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_outstanding_amount();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        year_month := TO_CHAR(NEW.invoice_date, 'YYYYMM');
        
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM invoice_db 
        WHERE invoice_number LIKE 'INV-' || year_month || '-%';
        
        NEW.invoice_number := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoice_db;
CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON invoice_db
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();