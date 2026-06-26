-- Retire the standalone Gmail AI summary inbox.
--
-- Gmail is now scoped to CRM leads and stored in lead_emails. Lead-level
-- conversation intelligence remains on leads and lead_interactions.

DROP TABLE IF EXISTS public.email_summaries CASCADE;
