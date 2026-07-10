-- LinkedIn outbound does not need a separate "Asked For Lead Magnet" column.
-- Treat those leads as replied, then remove the stage from existing boards.

WITH linkedin_outbound_campaigns AS (
  SELECT campaign_id
  FROM campaign_pipelines
  WHERE template_key = 'linkedin_outbound_lead_magnet'
)
UPDATE campaign_enrollments
SET
  stage_key = 'replied',
  updated_at = NOW(),
  last_event_at = COALESCE(last_event_at, NOW()),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'previous_stage_key', 'lead_magnet_requested',
    'migrated_from', '044_remove_linkedin_outbound_requested_stage'
  )
WHERE stage_key = 'lead_magnet_requested'
  AND campaign_id IN (SELECT campaign_id FROM linkedin_outbound_campaigns);

WITH linkedin_outbound_campaigns AS (
  SELECT campaign_id
  FROM campaign_pipelines
  WHERE template_key = 'linkedin_outbound_lead_magnet'
)
UPDATE campaign_events
SET
  stage_key = 'replied',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'previous_stage_key', 'lead_magnet_requested',
    'migrated_from', '044_remove_linkedin_outbound_requested_stage'
  )
WHERE stage_key = 'lead_magnet_requested'
  AND campaign_id IN (SELECT campaign_id FROM linkedin_outbound_campaigns);

WITH linkedin_outbound_campaigns AS (
  SELECT campaign_id
  FROM campaign_pipelines
  WHERE template_key = 'linkedin_outbound_lead_magnet'
)
UPDATE campaign_sequence_steps
SET trigger_stage_key = 'replied'
WHERE trigger_stage_key = 'lead_magnet_requested'
  AND campaign_id IN (SELECT campaign_id FROM linkedin_outbound_campaigns);

WITH linkedin_outbound_campaigns AS (
  SELECT campaign_id
  FROM campaign_pipelines
  WHERE template_key = 'linkedin_outbound_lead_magnet'
)
UPDATE campaign_sequence_steps
SET move_to_stage_key = 'replied'
WHERE move_to_stage_key = 'lead_magnet_requested'
  AND campaign_id IN (SELECT campaign_id FROM linkedin_outbound_campaigns);

WITH deleted_stages AS (
  DELETE FROM campaign_stages
  WHERE stage_key = 'lead_magnet_requested'
    AND campaign_id IN (
      SELECT campaign_id
      FROM campaign_pipelines
      WHERE template_key = 'linkedin_outbound_lead_magnet'
    )
  RETURNING campaign_id, position
)
UPDATE campaign_stages
SET position = campaign_stages.position - 1
FROM deleted_stages
WHERE campaign_stages.campaign_id = deleted_stages.campaign_id
  AND campaign_stages.position > deleted_stages.position;
