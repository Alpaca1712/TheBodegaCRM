-- Lead deletes should remove campaign activity tied to that lead.
-- Keeping campaign events with lead_id/enrollment_id nulled out leaves stale stats.

DELETE FROM campaign_events
WHERE lead_id IS NULL
  AND enrollment_id IS NULL;

DELETE FROM campaign_attribution_events
WHERE lead_id IS NULL
  AND campaign_enrollment_id IS NULL;

ALTER TABLE campaign_events
  DROP CONSTRAINT IF EXISTS campaign_events_lead_id_fkey,
  ADD CONSTRAINT campaign_events_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

ALTER TABLE campaign_events
  DROP CONSTRAINT IF EXISTS campaign_events_enrollment_id_fkey,
  ADD CONSTRAINT campaign_events_enrollment_id_fkey
    FOREIGN KEY (enrollment_id) REFERENCES campaign_enrollments(id) ON DELETE CASCADE;

ALTER TABLE campaign_attribution_events
  DROP CONSTRAINT IF EXISTS campaign_attribution_events_lead_id_fkey,
  ADD CONSTRAINT campaign_attribution_events_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

ALTER TABLE campaign_attribution_events
  DROP CONSTRAINT IF EXISTS campaign_attribution_events_campaign_enrollment_id_fkey,
  ADD CONSTRAINT campaign_attribution_events_campaign_enrollment_id_fkey
    FOREIGN KEY (campaign_enrollment_id) REFERENCES campaign_enrollments(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Org members can delete campaign events" ON campaign_events;
CREATE POLICY "Org members can delete campaign events" ON campaign_events FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can delete campaign attribution events" ON campaign_attribution_events;
CREATE POLICY "Org members can delete campaign attribution events" ON campaign_attribution_events FOR DELETE
  USING (org_id IN (SELECT public.get_user_org_ids()));
