-- A lead can participate in only one live campaign at a time. Goal stages and
-- Nurture / Lost release the lead for a future campaign.

UPDATE campaign_stages
SET is_terminal = TRUE
WHERE stage_key IN ('nurture_lost', 'not_interested', 'not_a_fit', 'no_response');

UPDATE campaign_enrollments enrollment
SET
  status = CASE WHEN stage.is_goal THEN 'completed' ELSE 'exited' END,
  completed_at = COALESCE(enrollment.completed_at, enrollment.last_event_at, enrollment.updated_at, NOW())
FROM campaign_stages stage
WHERE stage.campaign_id = enrollment.campaign_id
  AND stage.org_id = enrollment.org_id
  AND stage.stage_key = enrollment.stage_key
  AND (stage.is_goal OR stage.is_terminal)
  AND enrollment.status = 'active';

WITH ranked_active AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id, lead_id
      ORDER BY COALESCE(last_event_at, updated_at, enrolled_at) DESC, id DESC
    ) AS active_rank
  FROM campaign_enrollments
  WHERE status = 'active'
)
UPDATE campaign_enrollments enrollment
SET
  status = 'exited',
  completed_at = COALESCE(enrollment.completed_at, enrollment.last_event_at, enrollment.updated_at, NOW()),
  metadata = COALESCE(enrollment.metadata, '{}'::jsonb) || jsonb_build_object(
    'exit_reason', 'duplicate_active_enrollment_repaired',
    'repaired_at', NOW()
  )
FROM ranked_active ranked
WHERE ranked.id = enrollment.id
  AND ranked.active_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_enrollments_one_active_per_lead
  ON campaign_enrollments (org_id, lead_id)
  WHERE status = 'active';
