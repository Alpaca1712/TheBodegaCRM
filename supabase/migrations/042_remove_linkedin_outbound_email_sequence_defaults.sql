-- LinkedIn outbound campaigns are manually tracked outbound campaigns.
-- Remove old seeded sequence defaults so they do not send Gmail by surprise.

DELETE FROM campaign_sequence_steps step
USING campaign_pipelines pipeline
WHERE pipeline.campaign_id = step.campaign_id
  AND pipeline.org_id = step.org_id
  AND pipeline.template_key IN (
    'linkedin_outbound_lead_magnet',
    'linkedin_outbound_direct_offer'
  )
  AND step.metadata->>'seeded_from_template' IN (
    'linkedin_outbound_lead_magnet',
    'linkedin_outbound_direct_offer'
  );
