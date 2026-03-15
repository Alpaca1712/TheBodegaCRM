-- Fix RLS on email_accounts and email_summaries:
-- The org-based policies from 008 block inserts when org_id is NULL.
-- Add user-level fallback policies so users can always manage their own rows.

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Users can view own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can insert own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can update own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can delete own email accounts" ON email_accounts;

DROP POLICY IF EXISTS "Users can view own email summaries" ON email_summaries;
DROP POLICY IF EXISTS "Users can insert own email summaries" ON email_summaries;
DROP POLICY IF EXISTS "Users can update own email summaries" ON email_summaries;

DROP POLICY IF EXISTS "Users can view own lead emails" ON lead_emails;
DROP POLICY IF EXISTS "Users can insert own lead emails" ON lead_emails;
DROP POLICY IF EXISTS "Users can update own lead emails" ON lead_emails;

-- Email Accounts: allow user-level access as fallback
CREATE POLICY "Users can view own email accounts"
  ON email_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts"
  ON email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts"
  ON email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts"
  ON email_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Email Summaries: same fix
CREATE POLICY "Users can view own email summaries"
  ON email_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email summaries"
  ON email_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email summaries"
  ON email_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- Lead Emails: ensure user-level access works
CREATE POLICY "Users can view own lead emails"
  ON lead_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lead emails"
  ON lead_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead emails"
  ON lead_emails FOR UPDATE
  USING (auth.uid() = user_id);
