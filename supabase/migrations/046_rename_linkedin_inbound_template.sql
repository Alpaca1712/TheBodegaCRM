UPDATE campaign_pipelines
SET
  name = 'LinkedIn Inbound Lead Magnet',
  description = 'Tracked LinkedIn inbound flow: lead magnet opt-in, challenge click, application completion, then booked discovery.'
WHERE template_key = 'linkedin_inbound_playbook';
