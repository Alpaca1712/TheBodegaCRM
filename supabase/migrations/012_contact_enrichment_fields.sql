-- Add enrichment-related columns to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS seniority text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS enrichment_data jsonb;
