-- Clean up campaign boards after splitting LinkedIn outbound into modular
-- lead-magnet and direct-offer playbooks.

-- LinkedIn inbound is an opt-in flow. If older seeded data has an
-- "asked for lead magnet" stage, collapse it back into opted_in.
UPDATE campaign_enrollments enrollment
SET stage_key = 'opted_in',
    updated_at = NOW()
FROM campaign_pipelines pipeline
WHERE pipeline.campaign_id = enrollment.campaign_id
  AND pipeline.org_id = enrollment.org_id
  AND pipeline.template_key = 'linkedin_inbound_playbook'
  AND enrollment.stage_key = 'lead_magnet_requested';

UPDATE campaign_events event
SET stage_key = 'opted_in'
FROM campaign_pipelines pipeline
WHERE pipeline.campaign_id = event.campaign_id
  AND pipeline.org_id = event.org_id
  AND pipeline.template_key = 'linkedin_inbound_playbook'
  AND event.stage_key = 'lead_magnet_requested';

DELETE FROM campaign_stages stage
USING campaign_pipelines pipeline
WHERE pipeline.campaign_id = stage.campaign_id
  AND pipeline.org_id = stage.org_id
  AND pipeline.template_key = 'linkedin_inbound_playbook'
  AND stage.stage_key = 'lead_magnet_requested';
