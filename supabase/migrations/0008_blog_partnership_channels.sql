-- Segment website inbound into Blog / Partnerships / Affiliates.
-- Safe to re-run. Removes cold_email as a first-class default; former Web leads get `blog`.

-- 1) Partnership applications
update public.leads
set tags = (
  select coalesce(array_agg(distinct t), '{}'::text[])
  from unnest(coalesce(tags, '{}'::text[]) || array['partnership']) as t
)
where (
  lower(coalesce(source, '')) = 'landing:partnerships'
  or lower(coalesce(source, '')) like 'pigeonlabs_partnerships%'
  or coalesce(tags, '{}'::text[]) @> array['partnership']
)
and not (coalesce(tags, '{}'::text[]) @> array['partnership']);

-- 2) Blog: former web inbound that is not affiliate/referral/partnership
update public.leads
set tags = (
  select coalesce(array_agg(distinct t), '{}'::text[])
  from unnest(coalesce(tags, '{}'::text[]) || array['blog']) as t
)
where not (coalesce(tags, '{}'::text[]) @> array['blog'])
  and not (coalesce(tags, '{}'::text[]) && array[
    'referral', 'referral_influencer', 'referral_event',
    'affiliate', 'affiliate_influencer', 'affiliate_event',
    'partnership'
  ])
  and (
    coalesce(tags, '{}'::text[]) @> array['web_inbound']
    or coalesce(tags, '{}'::text[]) @> array['blog_subscriber']
    or lower(coalesce(source, '')) in ('landing', 'web_inbound', 'pigeonlabs_blog_subscription', 'landing:blog')
    or lower(coalesce(source, '')) like 'landing:%'
    or lower(coalesce(source, '')) like 'pigeonlabs_%'
  )
  and lower(coalesce(source, '')) not in ('landing:affiliates', 'landing:events', 'landing:partnerships')
  and lower(coalesce(source, '')) not like 'pigeonlabs_affiliates%'
  and lower(coalesce(source, '')) not like 'pigeonlabs_events%'
  and lower(coalesce(source, '')) not like 'pigeonlabs_partnerships%'
  and lower(coalesce(source, '')) not like 'event:%';

-- 3) Ensure blog subscribers keep both tags
update public.leads
set tags = (
  select coalesce(array_agg(distinct t), '{}'::text[])
  from unnest(coalesce(tags, '{}'::text[]) || array['blog', 'blog_subscriber']) as t
)
where lower(coalesce(source, '')) = 'pigeonlabs_blog_subscription'
   or coalesce(tags, '{}'::text[]) @> array['blog_subscriber'];

-- 4) Inbound flows: blog + partnerships seeds
insert into public.inbound_flows (key, name, description, is_default, actions) values
  (
    'blog_subscribe',
    'Blog subscribe',
    'Newsletter signups from the blog.',
    false,
    '{"stage": "new", "tags": ["website", "blog", "blog_subscriber", "newsletter"], "notify": true}'::jsonb
  ),
  (
    'partnerships',
    'Partnerships',
    'Agency / platform partnership applications via /partnerships.',
    false,
    '{"stage": "new", "tags": ["website", "partnership"], "notify": true}'::jsonb
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  actions = excluded.actions,
  updated_at = now();

-- Align existing blog_subscribe flow tags if present with older seed
update public.inbound_flows
set actions = jsonb_set(
  coalesce(actions, '{}'::jsonb),
  '{tags}',
  '["website", "blog", "blog_subscriber", "newsletter"]'::jsonb
)
where key = 'blog_subscribe';
