-- Add investor memo support
ALTER TABLE leads ADD COLUMN IF NOT EXISTS investor_memo JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS investor_memo_generated_at TIMESTAMPTZ;
