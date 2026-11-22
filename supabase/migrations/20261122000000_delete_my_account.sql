-- "Delete my account": a signed-in user deletes their own auth user. Everything they own goes
-- with it through the existing ON DELETE CASCADE chain:
--   auth.users → profiles → charts → readings, and auth.users → reading_generations.
-- No arguments: it can only ever delete auth.uid(), never another user.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
