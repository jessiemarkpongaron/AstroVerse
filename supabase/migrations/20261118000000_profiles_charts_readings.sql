-- M7: profiles, charts, readings with Row Level Security.
-- See docs/ARCHITECTURE.md §4. Birth data is personal: every table has RLS, users see only their
-- own rows, and the anon role has no table access at all.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on sign-up
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  locale text not null default 'en' check (locale in ('en', 'fil')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- charts: saved birth data. Other people's charts require confirmed consent (PRD F7, rule 7).
-- ---------------------------------------------------------------------------
create table public.charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  birth_date date not null check (birth_date between date '1900-01-01' and date '2100-12-31'),
  birth_time time,
  time_accuracy text not null check (time_accuracy in ('exact', 'approximate', 'unknown')),
  place_name text not null check (char_length(place_name) between 1 and 200),
  lat double precision not null check (lat > -90 and lat < 90),
  lon double precision not null check (lon >= -180 and lon <= 180),
  tz text not null check (char_length(tz) between 1 and 64),
  is_self boolean not null default false,
  consent_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint charts_time_matches_accuracy check ((time_accuracy = 'unknown') = (birth_time is null)),
  constraint charts_consent_for_others check (is_self or consent_confirmed)
);

create index charts_user_id_created_at_idx on public.charts (user_id, created_at desc);
-- At most one "Me" chart per user.
create unique index charts_one_self_per_user on public.charts (user_id) where is_self;

-- ---------------------------------------------------------------------------
-- readings: AI readings cached per chart. Written only by Edge Functions (service role).
-- ---------------------------------------------------------------------------
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references public.charts (id) on delete cascade,
  kind text not null check (kind in ('natal', 'forecast', 'career', 'synastry')),
  input_hash text not null check (char_length(input_hash) = 64),
  content jsonb not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  unique (chart_id, kind, input_hash)
);

create index readings_chart_id_idx on public.readings (chart_id);

-- ---------------------------------------------------------------------------
-- Profile on sign-up
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 80));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privileges: no anon access; authenticated gets only what policies allow.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.charts, public.readings from anon;
revoke all on public.profiles, public.charts, public.readings from authenticated;

grant select, update (display_name, locale) on public.profiles to authenticated;
grant select, insert, update, delete on public.charts to authenticated;
grant select, delete on public.readings to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.charts enable row level security;
alter table public.readings enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "charts: read own" on public.charts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "charts: insert own" on public.charts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "charts: update own" on public.charts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "charts: delete own" on public.charts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "readings: read own" on public.readings
  for select to authenticated
  using (exists (
    select 1 from public.charts c where c.id = readings.chart_id and c.user_id = (select auth.uid())
  ));
create policy "readings: delete own" on public.readings
  for delete to authenticated
  using (exists (
    select 1 from public.charts c where c.id = readings.chart_id and c.user_id = (select auth.uid())
  ));
