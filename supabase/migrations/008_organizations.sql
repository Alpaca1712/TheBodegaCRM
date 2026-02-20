-- Migration: 008_organizations
-- Multi-tenancy: organizations layer so multiple users can share CRM data.
--
-- Model:
--   auth.users → org_members (user_id, org_id, role) → org_id on every data table
--   RLS policies filter by org membership instead of user_id directly.
--   user_id is kept on data rows to track who created/owns a record within the org.

-- ─── Organizations ───

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Pending invites (email-based, before the user has an account)
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Add active_org_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ─── Helper function: returns all org_ids for the current user ───

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

-- ─── Add org_id to all data tables ───
-- Adding as nullable first, then backfilling, then setting NOT NULL.

ALTER TABLE contacts       ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE companies      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE deals          ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activities     ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tags           ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE investors      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE investments    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE email_summaries ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE acquisition_costs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ─── Backfill: create an org for each existing user and assign their data ───

DO $$
DECLARE
  u RECORD;
  new_org_id UUID;
BEGIN
  FOR u IN SELECT DISTINCT id, email FROM auth.users LOOP
    INSERT INTO organizations (name, slug)
    VALUES (
      COALESCE(split_part(u.email, '@', 1), 'My Organization'),
      COALESCE(replace(u.email, '@', '-at-'), gen_random_uuid()::text)
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO new_org_id;

    IF new_org_id IS NULL THEN
      SELECT id INTO new_org_id FROM organizations WHERE slug = replace(u.email, '@', '-at-');
    END IF;

    INSERT INTO org_members (org_id, user_id, role) VALUES (new_org_id, u.id, 'owner') ON CONFLICT DO NOTHING;
    UPDATE profiles SET active_org_id = new_org_id WHERE user_id = u.id AND active_org_id IS NULL;

    UPDATE contacts SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE companies SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE deals SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE activities SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE tags SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE investors SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE investments SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE email_accounts SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE email_summaries SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE acquisition_costs SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
  END LOOP;
END $$;

-- ─── Indexes on org_id ───

CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_companies_org_id ON companies(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_org_id ON deals(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_id ON activities(org_id);
CREATE INDEX IF NOT EXISTS idx_tags_org_id ON tags(org_id);
CREATE INDEX IF NOT EXISTS idx_investors_org_id ON investors(org_id);
CREATE INDEX IF NOT EXISTS idx_investments_org_id ON investments(org_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_org_id ON email_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_org_id ON email_summaries(org_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_org_id ON acquisition_costs(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);

-- ─── RLS on new tables ───

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their orgs" ON organizations FOR SELECT
  USING (id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Users can update orgs they own/admin" ON organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Authenticated users can create orgs" ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view members of their orgs" ON org_members FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org owners/admins can manage members" ON org_members FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Org owners/admins can update members" ON org_members FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Org owners/admins can remove members" ON org_members FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view invites for their orgs" ON org_invites FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org owners/admins can create invites" ON org_invites FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Org owners/admins can delete invites" ON org_invites FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ─── Update RLS policies on ALL data tables ───
-- Drop old user_id-only policies and create org-based ones.
-- Data is visible to anyone in the same org; writes require membership.

-- Contacts
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

CREATE POLICY "Org members can view contacts" ON contacts FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert contacts" ON contacts FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update contacts" ON contacts FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete contacts" ON contacts FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Companies
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;

CREATE POLICY "Org members can view companies" ON companies FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert companies" ON companies FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update companies" ON companies FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete companies" ON companies FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Deals
DROP POLICY IF EXISTS "Users can view their own deals" ON deals;
DROP POLICY IF EXISTS "Users can insert their own deals" ON deals;
DROP POLICY IF EXISTS "Users can update their own deals" ON deals;
DROP POLICY IF EXISTS "Users can delete their own deals" ON deals;

CREATE POLICY "Org members can view deals" ON deals FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert deals" ON deals FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update deals" ON deals FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete deals" ON deals FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Activities
DROP POLICY IF EXISTS "Users can view their own activities" ON activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON activities;

CREATE POLICY "Org members can view activities" ON activities FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert activities" ON activities FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update activities" ON activities FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete activities" ON activities FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Tags
DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON tags;

CREATE POLICY "Org members can view tags" ON tags FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert tags" ON tags FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update tags" ON tags FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete tags" ON tags FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Investors
DROP POLICY IF EXISTS "Users can view their own investors" ON investors;
DROP POLICY IF EXISTS "Users can insert their own investors" ON investors;
DROP POLICY IF EXISTS "Users can update their own investors" ON investors;
DROP POLICY IF EXISTS "Users can delete their own investors" ON investors;

CREATE POLICY "Org members can view investors" ON investors FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert investors" ON investors FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update investors" ON investors FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete investors" ON investors FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Investments
DROP POLICY IF EXISTS "Users can view their own investments" ON investments;
DROP POLICY IF EXISTS "Users can insert their own investments" ON investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON investments;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investments;

CREATE POLICY "Org members can view investments" ON investments FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert investments" ON investments FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update investments" ON investments FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete investments" ON investments FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Email Accounts
DROP POLICY IF EXISTS "Users can view their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can insert their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can update their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can delete their own email accounts" ON email_accounts;

CREATE POLICY "Org members can view email accounts" ON email_accounts FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert email accounts" ON email_accounts FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update email accounts" ON email_accounts FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete email accounts" ON email_accounts FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Email Summaries
DROP POLICY IF EXISTS "Users can view their own email summaries" ON email_summaries;
DROP POLICY IF EXISTS "Users can insert their own email summaries" ON email_summaries;
DROP POLICY IF EXISTS "Users can update their own email summaries" ON email_summaries;
DROP POLICY IF EXISTS "Users can delete their own email summaries" ON email_summaries;

CREATE POLICY "Org members can view email summaries" ON email_summaries FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert email summaries" ON email_summaries FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update email summaries" ON email_summaries FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete email summaries" ON email_summaries FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- Acquisition Costs
DROP POLICY IF EXISTS "Users can view their own acquisition costs" ON acquisition_costs;
DROP POLICY IF EXISTS "Users can insert their own acquisition costs" ON acquisition_costs;
DROP POLICY IF EXISTS "Users can update their own acquisition costs" ON acquisition_costs;
DROP POLICY IF EXISTS "Users can delete their own acquisition costs" ON acquisition_costs;

CREATE POLICY "Org members can view acquisition costs" ON acquisition_costs FOR SELECT
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can insert acquisition costs" ON acquisition_costs FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can update acquisition costs" ON acquisition_costs FOR UPDATE
  USING (org_id IN (SELECT public.get_user_org_ids()));
CREATE POLICY "Org members can delete acquisition costs" ON acquisition_costs FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

-- ─── Triggers ───

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Auto-create org on new user signup ───

CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
BEGIN
  org_slug := COALESCE(replace(NEW.email, '@', '-at-'), NEW.id::text);

  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'My Organization'),
    org_slug
  )
  ON CONFLICT (slug) DO UPDATE SET slug = org_slug || '-' || substr(gen_random_uuid()::text, 1, 8)
  RETURNING id INTO new_org_id;

  INSERT INTO org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  UPDATE profiles SET active_org_id = new_org_id WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();
