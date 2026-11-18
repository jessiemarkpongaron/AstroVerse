-- RLS and constraint tests for profiles / charts / readings (M7).
-- Run: npx supabase test db   (requires the local stack: npx supabase start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

-- Fixed ids
-- Alice  = 0000000a-0000-0000-0000-000000000001
-- Bob    = 0000000b-0000-0000-0000-000000000002
-- Alice's charts: self = c0000000-0000-0000-0000-00000000000a, friend = c0000000-0000-0000-0000-00000000000f

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('0000000a-0000-0000-0000-000000000001', 'alice@test.local', '{"full_name":"Alice"}', 'authenticated', 'authenticated'),
  ('0000000b-0000-0000-0000-000000000002', 'bob@test.local', '{}', 'authenticated', 'authenticated');

-- ---------------------------------------------------------------- setup checks (as owner)
select is(
  (select count(*)::int from public.profiles
   where id in ('0000000a-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000002')),
  2, 'sign-up trigger creates a profile per user');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.profiles'::regclass, 'public.charts'::regclass, 'public.readings'::regclass)),
  'RLS is enabled on profiles, charts and readings');

-- ---------------------------------------------------------------- as Alice
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0000000a-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok($$
  insert into public.charts (id, label, birth_date, birth_time, time_accuracy, place_name, lat, lon, tz, is_self)
  values ('c0000000-0000-0000-0000-00000000000a', 'Me', '1990-05-31', '15:30', 'exact',
          'Carrascal, Surigao del Sur, Philippines', 9.37, 125.95, 'Asia/Manila', true)
$$, 'Alice can save her own chart (user_id defaults to auth.uid())');

select is(
  (select user_id from public.charts where id = 'c0000000-0000-0000-0000-00000000000a'),
  '0000000a-0000-0000-0000-000000000001'::uuid, 'user_id is set to Alice');

select throws_ok($$
  insert into public.charts (label, birth_date, time_accuracy, place_name, lat, lon, tz, consent_confirmed)
  values ('Friend', '1992-01-01', 'unknown', 'Manila', 14.6, 121, 'Asia/Manila', false)
$$, '23514', null, 'saving another person''s chart without consent is rejected');

select lives_ok($$
  insert into public.charts (id, label, birth_date, time_accuracy, place_name, lat, lon, tz, consent_confirmed)
  values ('c0000000-0000-0000-0000-00000000000f', 'Friend', '1992-01-01', 'unknown', 'Manila', 14.6, 121, 'Asia/Manila', true)
$$, 'saving another person''s chart with consent works');

select throws_ok($$
  insert into public.charts (label, birth_date, birth_time, time_accuracy, place_name, lat, lon, tz, is_self)
  values ('X', '1990-01-01', '10:00', 'unknown', 'Manila', 14.6, 121, 'Asia/Manila', false)
$$, '23514', null, 'a birth time with accuracy "unknown" is rejected');

select throws_ok($$
  insert into public.charts (label, birth_date, time_accuracy, place_name, lat, lon, tz, consent_confirmed)
  values ('X', '1990-01-01', 'exact', 'Manila', 14.6, 121, 'Asia/Manila', true)
$$, '23514', null, 'accuracy "exact" without a birth time is rejected');

select throws_ok($$
  insert into public.charts (label, birth_date, birth_time, time_accuracy, place_name, lat, lon, tz, is_self)
  values ('Me again', '1990-05-31', '15:30', 'exact', 'Carrascal', 9.37, 125.95, 'Asia/Manila', true)
$$, '23505', null, 'only one "Me" chart per user');

select throws_ok($$
  insert into public.charts (label, birth_date, time_accuracy, place_name, lat, lon, tz, consent_confirmed)
  values ('Old', '1899-12-31', 'unknown', 'Manila', 14.6, 121, 'Asia/Manila', true)
$$, '23514', null, 'birth dates before 1900 are rejected');

select throws_ok($$
  insert into public.charts (user_id, label, birth_date, time_accuracy, place_name, lat, lon, tz, consent_confirmed)
  values ('0000000b-0000-0000-0000-000000000002', 'Sneaky', '1990-01-01', 'unknown', 'Manila', 14.6, 121, 'Asia/Manila', true)
$$, '42501', null, 'Alice cannot create a chart owned by Bob');

select is((select count(*)::int from public.charts), 2, 'Alice sees her 2 charts');

select is((select display_name from public.profiles), 'Alice', 'Alice sees only her own profile');

select throws_ok($$
  update public.charts set user_id = '0000000b-0000-0000-0000-000000000002'
  where id = 'c0000000-0000-0000-0000-00000000000f'
$$, '42501', null, 'Alice cannot hand a chart over to Bob');

select throws_ok($$
  update public.profiles set locale = 'fr'
$$, '23514', null, 'profile locale is restricted to en/fil');

select throws_ok($$
  update public.profiles set id = '0000000b-0000-0000-0000-000000000002'
$$, '42501', null, 'profile id cannot be changed');

-- ---------------------------------------------------------------- as Bob
select set_config('request.jwt.claims', '{"sub":"0000000b-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*)::int from public.charts), 0, 'Bob cannot see Alice''s charts');
select is((select count(*)::int from public.profiles), 1, 'Bob sees only his own profile');

update public.charts set label = 'hacked' where id = 'c0000000-0000-0000-0000-00000000000a';
delete from public.charts where id = 'c0000000-0000-0000-0000-00000000000a';

select throws_ok($$
  insert into public.readings (chart_id, kind, input_hash, content, model, prompt_version)
  values ('c0000000-0000-0000-0000-00000000000a', 'natal', repeat('b', 64), '{}', 'm', 'v1')
$$, '42501', null, 'Bob cannot write readings');

-- ---------------------------------------------------------------- as owner (service role path)
reset role;

select is(
  (select label from public.charts where id = 'c0000000-0000-0000-0000-00000000000a'), 'Me',
  'Bob''s update of Alice''s chart changed nothing');
select is(
  (select count(*)::int from public.charts where id = 'c0000000-0000-0000-0000-00000000000a'), 1,
  'Bob''s delete of Alice''s chart removed nothing');

insert into public.readings (chart_id, kind, input_hash, content, model, prompt_version)
values ('c0000000-0000-0000-0000-00000000000a', 'natal', repeat('a', 64), '{"summary":"hi"}', 'test-model', 'v1');

select throws_ok($$
  insert into public.readings (chart_id, kind, input_hash, content, model, prompt_version)
  values ('c0000000-0000-0000-0000-00000000000a', 'natal', repeat('a', 64), '{}', 'test-model', 'v1')
$$, '23505', null, 'readings are unique per (chart, kind, input_hash)');

-- ---------------------------------------------------------------- readings visibility
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0000000b-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.readings), 0, 'Bob cannot see Alice''s readings');

select set_config('request.jwt.claims', '{"sub":"0000000a-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.readings), 1, 'Alice sees her reading');

select throws_ok($$
  update public.readings set content = '{"summary":"edited"}'
$$, '42501', null, 'Alice cannot edit a reading');

select throws_ok($$
  insert into public.readings (chart_id, kind, input_hash, content, model, prompt_version)
  values ('c0000000-0000-0000-0000-00000000000a', 'career', repeat('c', 64), '{}', 'm', 'v1')
$$, '42501', null, 'Alice cannot write readings directly (Edge Function only)');

select lives_ok($$
  delete from public.charts where id = 'c0000000-0000-0000-0000-00000000000a'
$$, 'Alice can delete her chart');

reset role;
select is(
  (select count(*)::int from public.readings where chart_id = 'c0000000-0000-0000-0000-00000000000a'), 0,
  'deleting a chart deletes its readings');

-- ---------------------------------------------------------------- reading_generations (M8 rate limit)
select ok(
  (select relrowsecurity from pg_class where oid = 'public.reading_generations'::regclass),
  'RLS is enabled on reading_generations');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0000000a-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$ select count(*) from public.reading_generations $$, '42501', null,
  'users cannot read the generation log');
select throws_ok($$ insert into public.reading_generations (user_id) values ('0000000a-0000-0000-0000-000000000001') $$,
  '42501', null, 'users cannot write the generation log');
select throws_ok($$ select public.consume_reading_generation('0000000a-0000-0000-0000-000000000001', 1000) $$,
  '42501', null, 'users cannot call consume_reading_generation (Edge Function only)');

set local role service_role;
select is(
  (select array_agg(public.consume_reading_generation('0000000b-0000-0000-0000-000000000002', 3)) from generate_series(1, 4)),
  array[true, true, true, false], 'the 4th generation within 24 h is refused at limit 3');
select is(
  (select count(*)::int from public.reading_generations where user_id = '0000000b-0000-0000-0000-000000000002'),
  3, 'a refused generation is not recorded');
reset role;
update public.reading_generations set created_at = now() - interval '25 hours'
  where user_id = '0000000b-0000-0000-0000-000000000002';
set local role service_role;
select ok(public.consume_reading_generation('0000000b-0000-0000-0000-000000000002', 3),
  'generations older than 24 h no longer count');
reset role;

-- ---------------------------------------------------------------- anon
set local role anon;
select throws_ok($$ select count(*) from public.charts $$, '42501', null, 'anon cannot read charts');
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select count(*) from public.readings $$, '42501', null, 'anon cannot read readings');

reset role;
select * from finish();
rollback;
