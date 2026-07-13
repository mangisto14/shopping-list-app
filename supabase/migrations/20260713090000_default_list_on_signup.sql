-- Bootstrap a default list, membership, and default categories for
-- every user at the moment their auth.users row is created - covering
-- email/password signup, OAuth/future providers, and direct auth.users
-- inserts alike, since all of them go through this one table.
--
-- Initialization lives entirely at the database layer (a trigger on
-- auth.users), not in React, so it can never be skipped by a signup
-- path the frontend doesn't control.

-- ---------------------------------------------------------------------
-- Shared bootstrap logic. SECURITY DEFINER + owned by the migration
-- role (which bypasses RLS, same mechanism already used by
-- is_list_owner/is_list_member), so these inserts succeed regardless of
-- RLS - there is no authenticated session/auth.uid() at all when this
-- runs from the trigger, since it fires during the signup process
-- itself, before any client session exists.
--
-- Idempotent per user: if the user already owns a list, this is a
-- no-op. Safe to invoke more than once for the same user from the
-- trigger, a manual call, or the backfill below.
-- ---------------------------------------------------------------------
create or replace function public.create_default_list_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_list_id uuid;
begin
  if exists (select 1 from public.lists where owner_id = p_user_id) then
    return;
  end if;

  insert into public.lists (name, owner_id)
  values ('My List', p_user_id)
  returning id into new_list_id;

  insert into public.list_members (list_id, user_id)
  values (new_list_id, p_user_id);

  insert into public.categories (list_id, user_id, name)
  values
    (new_list_id, p_user_id, 'ירקות'),
    (new_list_id, p_user_id, 'פירות'),
    (new_list_id, p_user_id, 'מוצרי חלב'),
    (new_list_id, p_user_id, 'בשר ודגים'),
    (new_list_id, p_user_id, 'מאפים ולחם'),
    (new_list_id, p_user_id, 'שתייה'),
    (new_list_id, p_user_id, 'ניקיון'),
    (new_list_id, p_user_id, 'פארם וטיפוח');
end;
$$;

-- Not an RPC endpoint: only the trigger below and this migration's own
-- backfill should ever call this. Revoke the default PUBLIC execute
-- grant so no authenticated client can invoke it over the API with an
-- arbitrary p_user_id and create rows for other users.
revoke all on function public.create_default_list_for_user(uuid) from public;

-- ---------------------------------------------------------------------
-- Trigger function. Errors are caught and logged rather than left to
-- propagate: an unhandled exception here would roll back the entire
-- auth.users insert, meaning a bug in this bootstrap logic would break
-- every signup, on every provider, app-wide. The app already has a
-- working empty-state fallback for "user has zero lists", so failing
-- soft here (log + let signup succeed) is the safer failure mode than
-- failing hard.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.create_default_list_for_user(new.id);
  exception when others then
    raise warning 'handle_new_user: failed to bootstrap default list for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- One-time backfill for any users created before this migration.
-- Idempotent via the same per-user guard inside
-- create_default_list_for_user - a no-op for anyone who already has a
-- list, safe to rerun.
-- ---------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.create_default_list_for_user(u.id);
  end loop;
end $$;
