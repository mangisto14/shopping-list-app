-- Every new shopping list - not just the one auto-created at signup -
-- should start with the same default category set. Previously only
-- create_default_list_for_user() seeded categories, and only for the
-- one list it creates at signup; any list created afterwards via
-- useLists.createList() got zero categories.
--
-- Implemented as a trigger on public.lists itself (after insert),
-- rather than a client-side change to useLists.ts, so the guarantee
-- holds for every current and future list-creation path - the signup
-- bootstrap, the app's "create list" UI, and anything else - without
-- relying on every call site remembering to seed categories itself.
--
-- Existing lists are completely unaffected: this only fires on INSERT,
-- there is no backfill, so nobody's already-customized category list
-- gets categories added or changed.

-- ---------------------------------------------------------------------
-- Shared seeding function. Idempotent per list: a list that already has
-- at least one category (seeded by this function, or created/renamed
-- by hand) is left alone - "created only once per list, never
-- duplicated" holds even if this were ever invoked twice for the same
-- list.
-- ---------------------------------------------------------------------
create or replace function public.seed_default_categories(p_list_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.categories where list_id = p_list_id) then
    return;
  end if;

  insert into public.categories (list_id, user_id, name)
  values
    (p_list_id, p_user_id, 'מוצרי חלב'),
    (p_list_id, p_user_id, 'ירקות'),
    (p_list_id, p_user_id, 'פירות'),
    (p_list_id, p_user_id, 'מאפים'),
    (p_list_id, p_user_id, 'בשר ודגים'),
    (p_list_id, p_user_id, 'משקאות'),
    (p_list_id, p_user_id, 'קפואים'),
    (p_list_id, p_user_id, 'ניקיון'),
    (p_list_id, p_user_id, 'אחר');
end;
$$;

-- Not an RPC endpoint: only the trigger below (and create_default_list_
-- for_user, indirectly, via that same trigger) should ever call this.
revoke all on function public.seed_default_categories(uuid, uuid) from public;

-- ---------------------------------------------------------------------
-- Trigger function. Same fail-soft pattern as handle_new_user(): an
-- unhandled exception here would roll back the entire list insert, so
-- a bug in this seeding logic must never block someone from creating a
-- list at all.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.seed_default_categories(new.id, new.owner_id);
  exception when others then
    raise warning 'handle_new_list: failed to seed default categories for list %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_new_list() from public;

drop trigger if exists on_list_created on public.lists;
create trigger on_list_created
  after insert on public.lists
  for each row
  execute function public.handle_new_list();

-- ---------------------------------------------------------------------
-- create_default_list_for_user() no longer inserts categories itself -
-- the trigger above now does that uniformly for every list, including
-- this one, the moment the `lists` row is inserted below. This also
-- brings the signup-time default list onto the same 9-category set as
-- every other list, replacing the old, differently-named 8-category
-- set it used to insert inline.
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
end;
$$;

revoke all on function public.create_default_list_for_user(uuid) from public;
