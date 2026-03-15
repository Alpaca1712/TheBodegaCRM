-- Add 'partnership' as a lead type
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_type_check CHECK (type IN ('customer', 'investor', 'partnership'));
