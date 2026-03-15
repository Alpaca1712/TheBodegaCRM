-- Migration: 014_migrate_old_to_leads
-- Migrate data from old contacts/companies/investors tables into the new unified leads table,
-- then drop all deprecated tables.

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: Migrate contacts + companies → leads (type = 'customer')
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO leads (
  user_id, type,
  company_name, contact_name, contact_title, contact_email,
  contact_linkedin, contact_twitter,
  company_description, source, notes, stage, priority,
  created_at, updated_at
)
SELECT
  c.user_id,
  'customer',
  COALESCE(co.name, 'Unknown Company'),
  TRIM(c.first_name || ' ' || c.last_name),
  c.title,
  c.email,
  c.linkedin_url,
  c.twitter_url,
  CASE
    WHEN co.industry IS NOT NULL AND co.website IS NOT NULL
      THEN co.industry || ' company. Website: ' || co.website
    WHEN co.industry IS NOT NULL THEN co.industry || ' company'
    WHEN co.website IS NOT NULL THEN 'Website: ' || co.website
    ELSE NULL
  END,
  c.source,
  c.notes,
  CASE c.status
    WHEN 'active' THEN 'researched'
    WHEN 'lead'   THEN 'researched'
    WHEN 'inactive' THEN 'closed_lost'
    ELSE 'researched'
  END,
  'medium',
  c.created_at,
  c.updated_at
FROM contacts c
LEFT JOIN companies co ON c.company_id = co.id;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: Migrate investors → leads (type = 'investor')
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO leads (
  user_id, type,
  company_name, fund_name, contact_name, contact_email,
  contact_linkedin,
  investment_thesis_notes, notes, stage, priority,
  last_contacted_at, created_at, updated_at
)
SELECT
  i.user_id,
  'investor',
  COALESCE(i.firm, i.name),
  i.firm,
  i.name,
  i.email,
  i.linkedin_url,
  i.thesis,
  i.notes,
  CASE i.relationship_status
    WHEN 'cold'      THEN 'researched'
    WHEN 'warm'      THEN 'email_sent'
    WHEN 'hot'       THEN 'replied'
    WHEN 'portfolio' THEN 'closed_won'
    WHEN 'passed'    THEN 'closed_lost'
    ELSE 'researched'
  END,
  CASE
    WHEN i.relationship_status = 'hot' THEN 'high'
    WHEN i.relationship_status = 'warm' THEN 'medium'
    ELSE 'medium'
  END,
  i.last_contacted_at,
  i.created_at,
  i.updated_at
FROM investors i;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Update email_summaries — add lead_id, map old refs, drop old FKs
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE email_summaries ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_summaries_lead_id ON email_summaries(lead_id);

-- Map email_summaries to leads by matching contact email
UPDATE email_summaries es
SET lead_id = l.id
FROM contacts c
JOIN leads l ON l.contact_email = c.email AND l.user_id = c.user_id
WHERE es.contact_id = c.id
  AND es.lead_id IS NULL
  AND c.email IS NOT NULL;

-- Map email_summaries linked to investors
UPDATE email_summaries es
SET lead_id = l.id
FROM investors i
JOIN leads l ON l.contact_email = i.email AND l.user_id = i.user_id AND l.type = 'investor'
WHERE es.investor_id = i.id
  AND es.lead_id IS NULL
  AND i.email IS NOT NULL;

-- Update reminders: clean up references to old entity types
DELETE FROM reminders WHERE entity_type IN ('contact', 'company', 'deal', 'activity', 'investor');

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Drop all deprecated tables (order matters for FK deps)
-- ═══════════════════════════════════════════════════════════════════

-- Sequences (depend on contacts)
DROP TABLE IF EXISTS sequence_step_executions CASCADE;
DROP TABLE IF EXISTS sequence_enrollments CASCADE;
DROP TABLE IF EXISTS sequence_steps CASCADE;
DROP TABLE IF EXISTS sequences CASCADE;

-- Automations
DROP TABLE IF EXISTS automation_runs CASCADE;
DROP TABLE IF EXISTS automations CASCADE;

-- Tags (depend on contacts)
DROP TABLE IF EXISTS contact_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Investments (depend on investors)
DROP TABLE IF EXISTS investments CASCADE;

-- Notes (depend on contacts, companies, deals)
DROP TABLE IF EXISTS notes CASCADE;

-- Activities (depend on contacts, companies, deals)
DROP TABLE IF EXISTS activities CASCADE;

-- Deals (depend on contacts, companies)
DROP TABLE IF EXISTS deals CASCADE;

-- Now drop the FK columns from email_summaries before dropping parent tables
ALTER TABLE email_summaries DROP CONSTRAINT IF EXISTS email_summaries_contact_id_fkey;
ALTER TABLE email_summaries DROP CONSTRAINT IF EXISTS email_summaries_deal_id_fkey;
ALTER TABLE email_summaries DROP CONSTRAINT IF EXISTS email_summaries_investor_id_fkey;
ALTER TABLE email_summaries DROP COLUMN IF EXISTS contact_id;
ALTER TABLE email_summaries DROP COLUMN IF EXISTS deal_id;
ALTER TABLE email_summaries DROP COLUMN IF EXISTS investor_id;

-- Investors (contacts FK already gone via CASCADE)
DROP TABLE IF EXISTS investors CASCADE;

-- Contacts (depends on companies)
DROP TABLE IF EXISTS contacts CASCADE;

-- Companies
DROP TABLE IF EXISTS companies CASCADE;

-- Acquisition costs (not needed in Rocoto)
DROP TABLE IF EXISTS acquisition_costs CASCADE;
