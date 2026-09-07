-- Flip the seeded AI default from DeepSeek V3.2 → V4 Flash.
-- Only rewrites rows still on the old default so intentional overrides stay put.
update public.settings
set
  value = jsonb_set(value, '{default_model}', '"deepseek/deepseek-v4-flash"'::jsonb),
  updated_at = now()
where key = 'ai'
  and value->>'default_model' = 'deepseek/deepseek-v3.2';
