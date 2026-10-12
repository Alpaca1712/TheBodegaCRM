-- Retire the Vertical SaaS AI playbook inbound flow and lead magnet.
-- Historical leads with pigeonlabs_playbook* sources remain classed as Web.

update public.sequence_steps
set lead_magnet_id = null
where lead_magnet_id in (
  select id from public.lead_magnets where slug = 'vertical-saas-ai-playbook'
);

delete from public.inbound_flows where key = 'playbook';

delete from public.lead_magnets where slug = 'vertical-saas-ai-playbook';
