-- Hosting Angel: household contact details
-- Already applied to Supabase project hhwrfssjihchofutiujs — kept here for the record.

alter table households
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text;
