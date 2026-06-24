-- Idempotency guard for BodegaCRM lead magnet delivery.
--
-- Recommended cron/webhook flow:
-- 1. Select leads with a web lead_magnet_requested interaction, no
--    qualification_completed interaction, a non-null leads.lead_token, and no
--    outbound lead_magnet lead_emails row.
-- 2. Insert one outbound lead_emails row with email_type = 'lead_magnet' and
--    sent_at = NULL before calling the email provider. This insert is the send
--    lock; if it conflicts, another worker already claimed or sent it.
-- 3. After the provider accepts the email, update that same row's sent_at.

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_emails_one_outbound_lead_magnet_per_lead
  ON lead_emails (lead_id)
  WHERE email_type = 'lead_magnet'
    AND direction = 'outbound';

CREATE INDEX IF NOT EXISTS idx_lead_emails_outbound_lead_magnet_delivery
  ON lead_emails (lead_id, sent_at)
  WHERE email_type = 'lead_magnet'
    AND direction = 'outbound';
