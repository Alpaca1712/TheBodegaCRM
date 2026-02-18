-- Migration: 002_companies
-- Create companies table for TheBodegaCRM

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  website TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_city TEXT,
  address_state TEXT,
  address_country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_name ON companies(name);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own companies" 
  ON companies FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" 
  ON companies FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" 
  ON companies FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" 
  ON companies FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Comments
COMMENT ON TABLE companies IS 'Stores company information for TheBodegaCRM';
COMMENT ON COLUMN companies.user_id IS 'The user who owns this company record';
COMMENT ON COLUMN companies.name IS 'Company name (required)';
COMMENT ON COLUMN companies.domain IS 'Company domain/website domain';
COMMENT ON COLUMN companies.industry IS 'Industry/sector (e.g., Technology, Healthcare, Finance)';
COMMENT ON COLUMN companies.size IS 'Company size category';
COMMENT ON COLUMN companies.website IS 'Full website URL';
COMMENT ON COLUMN companies.phone IS 'Company phone number';
COMMENT ON COLUMN companies.address_line1 IS 'Street address line 1';
COMMENT ON COLUMN companies.address_city IS 'City';
COMMENT ON COLUMN companies.address_state IS 'State/province';
COMMENT ON COLUMN companies.address_country IS 'Country';
COMMENT ON COLUMN companies.logo_url IS 'URL to company logo image';
