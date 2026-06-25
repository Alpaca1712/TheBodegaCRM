-- Application Started is not a reliable funnel signal for the current landing flow.
-- We know when a tracked challenge link is clicked and when the application is completed.

UPDATE campaign_stages stage
SET
  stage_key = 'challenge_link_clicked',
  label = 'Challenge Link Clicked'
WHERE stage.stage_key = 'application_started'
  AND NOT EXISTS (
    SELECT 1
    FROM campaign_stages existing
    WHERE existing.campaign_id = stage.campaign_id
      AND existing.stage_key = 'challenge_link_clicked'
  );

UPDATE campaign_enrollments enrollment
SET
  stage_key = 'challenge_link_clicked',
  updated_at = NOW()
WHERE enrollment.stage_key = 'application_started'
  AND EXISTS (
    SELECT 1
    FROM campaign_stages stage
    WHERE stage.campaign_id = enrollment.campaign_id
      AND stage.org_id = enrollment.org_id
      AND stage.stage_key = 'challenge_link_clicked'
  );

DELETE FROM campaign_stages
WHERE stage_key = 'application_started';

WITH ranked_stages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id
      ORDER BY position, created_at, id
    ) - 1 AS next_position
  FROM campaign_stages
)
UPDATE campaign_stages stage
SET position = ranked_stages.next_position
FROM ranked_stages
WHERE stage.id = ranked_stages.id;
