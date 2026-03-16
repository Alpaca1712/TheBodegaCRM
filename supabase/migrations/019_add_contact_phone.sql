-- Add phone number field to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_phone TEXT;
