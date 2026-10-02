-- Rename affiliate* tags / flows / custom JSON to referral* (Coo Crew referral program).
-- Safe to re-run. Keeps landing:affiliates source/slug (public URL unchanged).

-- 1) Remap lead tags
update public.leads
set tags = (
  select coalesce(array_agg(distinct
    case t
      when 'affiliate' then 'referral'
      when 'affiliate_influencer' then 'referral_influencer'
      when 'affiliate_event' then 'referral_event'
      else t
    end
  ), '{}'::text[])
  from unnest(coalesce(tags, '{}'::text[])) as t
)
where coalesce(tags, '{}'::text[]) && array['affiliate', 'affiliate_influencer', 'affiliate_event'];

-- 2) Move custom.affiliate -> custom.referral (keep old key removed)
update public.leads
set custom =
  (coalesce(custom, '{}'::jsonb) - 'affiliate')
  || jsonb_build_object('referral', custom->'affiliate')
where custom ? 'affiliate'
  and not (custom ? 'referral');

-- If both somehow exist, drop legacy affiliate key
update public.leads
set custom = custom - 'affiliate'
where custom ? 'affiliate' and custom ? 'referral';

-- 3) Inbound flows: rename keys + action tags
update public.inbound_flows
set
  key = 'referral_influencer',
  name = 'Referral - influencer',
  description = 'Creators and influencers applying via /affiliates (Coo Crew).',
  actions = jsonb_set(
    coalesce(actions, '{}'::jsonb),
    '{tags}',
    '["website", "referral", "referral_influencer"]'::jsonb
  )
where key = 'affiliate_influencer'
  and not exists (select 1 from public.inbound_flows where key = 'referral_influencer');

update public.inbound_flows
set
  key = 'referral_event',
  name = 'Referral - event',
  description = 'People met at conferences / meetups via /events.',
  actions = jsonb_set(
    coalesce(actions, '{}'::jsonb),
    '{tags}',
    '["website", "referral", "referral_event"]'::jsonb
  )
where key = 'affiliate_event'
  and not exists (select 1 from public.inbound_flows where key = 'referral_event');

-- Drop leftovers if rename couldn't run because target already existed
delete from public.inbound_flows where key in ('affiliate_influencer', 'affiliate_event');

-- Ensure referral flows exist even on fresh DBs
insert into public.inbound_flows (key, name, description, is_default, actions) values
  (
    'referral_influencer',
    'Referral - influencer',
    'Creators and influencers applying via /affiliates (Coo Crew).',
    false,
    '{"stage": "new", "tags": ["website", "referral", "referral_influencer"], "notify": true}'::jsonb
  ),
  (
    'referral_event',
    'Referral - event',
    'People met at conferences / meetups via /events.',
    false,
    '{"stage": "new", "tags": ["website", "referral", "referral_event"], "notify": true}'::jsonb
  )
on conflict (key) do nothing;
