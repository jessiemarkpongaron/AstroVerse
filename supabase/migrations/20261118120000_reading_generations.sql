-- M8: per-user rate limit for AI reading generations (ARCHITECTURE.md §5: 20 per user per day).
-- Rows are written only by the generate-reading Edge Function (service role) through
-- consume_reading_generation(). They are kept even if the chart is deleted, so deleting and
-- re-saving a chart cannot reset the limit.

create table public.reading_generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index reading_generations_user_id_created_at_idx
  on public.reading_generations (user_id, created_at desc);

alter table public.reading_generations enable row level security;
-- No policies and no grants: only the service role (which bypasses RLS) can touch it.
revoke all on public.reading_generations from anon, authenticated;

-- Atomically check the rolling-24-hour count and record one generation.
-- Returns false (and records nothing) when the user is at the limit.
create function public.consume_reading_generation(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  -- Serialize concurrent requests for the same user so two can't both pass at limit − 1.
  perform pg_advisory_xact_lock(hashtextextended('reading_generations:' || p_user_id::text, 0));

  select count(*) into used
  from public.reading_generations
  where user_id = p_user_id and created_at > now() - interval '24 hours';

  if used >= p_limit then
    return false;
  end if;

  insert into public.reading_generations (user_id) values (p_user_id);
  return true;
end;
$$;

revoke execute on function public.consume_reading_generation(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.consume_reading_generation(uuid, integer) to service_role;
