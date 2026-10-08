-- Fix over-broad blog tagging: only newsletter / blog-index signups stay on Blog.
-- Landing / pentest / playbook inbound moves to Web. Safe to re-run.

-- 1) Strip `blog` from non-blog website inbound; add `web`
update public.leads
set tags = (
  select coalesce(array_agg(distinct t), '{}'::text[])
  from unnest(
    array(
      select x from unnest(coalesce(tags, '{}'::text[])) as x
      where x <> 'blog'
    ) || array['web']
  ) as t
)
where coalesce(tags, '{}'::text[]) @> array['blog']
  and not (coalesce(tags, '{}'::text[]) @> array['blog_subscriber'])
  and lower(coalesce(source, '')) not in (
    'pigeonlabs_blog_subscription',
    'landing:blog'
  )
  and lower(coalesce(source, '')) not like 'pigeonlabs_blog%'
  and not (coalesce(tags, '{}'::text[]) && array[
    'referral', 'referral_influencer', 'referral_event',
    'affiliate', 'affiliate_influencer', 'affiliate_event',
    'partnership'
  ]);

-- 2) Ensure true blog subscribers keep blog + blog_subscriber
update public.leads
set tags = (
  select coalesce(array_agg(distinct t), '{}'::text[])
  from unnest(coalesce(tags, '{}'::text[]) || array['blog', 'blog_subscriber']) as t
)
where lower(coalesce(source, '')) = 'pigeonlabs_blog_subscription'
   or lower(coalesce(source, '')) = 'landing:blog'
   or coalesce(tags, '{}'::text[]) @> array['blog_subscriber'];

-- 3) Tag remaining generic website inbound with `web` when missing
update public.leads
set tags = (
  select coalesce(array_agg(distinct t), '{}'::text[])
  from unnest(coalesce(tags, '{}'::text[]) || array['web']) as t
)
where not (coalesce(tags, '{}'::text[]) @> array['web'])
  and not (coalesce(tags, '{}'::text[]) @> array['blog_subscriber'])
  and not (coalesce(tags, '{}'::text[]) && array[
    'referral', 'referral_influencer', 'referral_event',
    'affiliate', 'affiliate_influencer', 'affiliate_event',
    'partnership', 'blog'
  ])
  and (
    coalesce(tags, '{}'::text[]) @> array['web_inbound']
    or lower(coalesce(source, '')) in ('landing', 'web_inbound', 'landing:home')
    or lower(coalesce(source, '')) like 'landing:pentest%'
    or lower(coalesce(source, '')) like 'pigeonlabs_pentest%'
    or lower(coalesce(source, '')) like 'pigeonlabs_playbook%'
  );
