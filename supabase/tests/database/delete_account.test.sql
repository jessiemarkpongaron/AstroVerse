-- delete_my_account(): a user deletes only their own account, with everything they own.
-- Run: npx supabase test db   (requires the local stack: npx supabase start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- Carol = 0000000c-…, Dave = 0000000d-…
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('0000000c-0000-0000-0000-000000000003', 'carol@test.local', '{"full_name":"Carol"}', 'authenticated', 'authenticated'),
  ('0000000d-0000-0000-0000-000000000004', 'dave@test.local', '{}', 'authenticated', 'authenticated');

insert into public.charts (id, user_id, label, birth_date, time_accuracy, place_name, lat, lon, tz, is_self)
values
  ('c0000000-0000-0000-0000-0000000000c1', '0000000c-0000-0000-0000-000000000003', 'Me', '1990-05-31',
   'unknown', 'Manila', 14.6, 121, 'Asia/Manila', true),
  ('c0000000-0000-0000-0000-0000000000d1', '0000000d-0000-0000-0000-000000000004', 'Me', '1991-01-01',
   'unknown', 'Cebu', 10.3, 123.9, 'Asia/Manila', true);

insert into public.readings (chart_id, kind, input_hash, content, model, prompt_version)
values ('c0000000-0000-0000-0000-0000000000c1', 'natal', repeat('a', 64), '{}', 'test', 'v1');

insert into public.reading_generations (user_id) values ('0000000c-0000-0000-0000-000000000003');

-- ---------------------------------------------------------------- not signed in
set local role anon;
select throws_ok($$ select public.delete_my_account() $$, '42501', null,
  'anonymous visitors cannot call delete_my_account');
reset role;

-- ---------------------------------------------------------------- as Carol
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0000000c-0000-0000-0000-000000000003","role":"authenticated"}', true);
select lives_ok($$ select public.delete_my_account() $$, 'Carol can delete her account');
reset role;

select is((select count(*)::int from auth.users where id = '0000000c-0000-0000-0000-000000000003'),
  0, 'Carol''s auth user is gone');
select is((select count(*)::int from public.profiles where id = '0000000c-0000-0000-0000-000000000003'),
  0, 'her profile is gone');
select is((select count(*)::int from public.charts where user_id = '0000000c-0000-0000-0000-000000000003'),
  0, 'her charts are gone');
select is((select count(*)::int from public.readings where chart_id = 'c0000000-0000-0000-0000-0000000000c1'),
  0, 'her readings are gone');
select is((select count(*)::int from public.reading_generations where user_id = '0000000c-0000-0000-0000-000000000003'),
  0, 'her rate-limit rows are gone');

select is((select count(*)::int from public.charts where user_id = '0000000d-0000-0000-0000-000000000004'),
  1, 'Dave''s chart is untouched');

-- ---------------------------------------------------------------- authenticated but no sub claim
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$ select public.delete_my_account() $$, '28000', null,
  'a token without a user id is rejected');
reset role;

select * from finish();
rollback;
