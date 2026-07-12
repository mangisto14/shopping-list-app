-- Phase 1D: cut items/categories authorization over from user ownership
-- (auth.uid() = user_id) to list membership. Pure RLS change: no rows,
-- no ownership data, no other schema touched.
--
-- Depends on Phase 1B already being applied (public.lists,
-- public.list_members, public.is_list_member(), public.is_list_owner()).

-- ---------------------------------------------------------------------
-- Safety gate: refuse to cut over while any items/categories rows are
-- not yet linked to a list. list_id is still nullable (Phase 1B left it
-- that way on purpose) - if this ran while unlinked rows exist, those
-- rows would become permanently inaccessible via the API to *everyone*,
-- including their original owner, since no list_members row can ever
-- match a NULL list_id. Better to abort the whole migration than to
-- silently orphan someone's data.
-- ---------------------------------------------------------------------
do $$
declare
  unlinked_items integer;
  unlinked_categories integer;
begin
  select count(*) into unlinked_items from public.items where list_id is null;
  select count(*) into unlinked_categories from public.categories where list_id is null;

  if unlinked_items > 0 or unlinked_categories > 0 then
    raise exception
      'Phase 1D aborted: % items and % categories rows have no list_id. Resolve these (backfill or remove) before rerunning this migration.',
      unlinked_items, unlinked_categories;
  end if;
end $$;

alter table public.items enable row level security;
alter table public.categories enable row level security;

-- ---------------------------------------------------------------------
-- Drop whatever policies currently exist on items/categories, whatever
-- they're named or defined as. We intentionally do not hardcode policy
-- names here: this migration was written without direct read access to
-- the live database's actual policy definitions, so rather than assume
-- what they are, this discovers and removes them dynamically.
-- ---------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename in ('items', 'categories')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- New policies: membership is the only gate. is_list_member() already
-- resolves auth.uid() internally and is SECURITY DEFINER (bypasses RLS
-- on its own lookup against list_members), so this introduces no new
-- recursion risk - items/categories don't participate in the
-- lists <-> list_members cycle that required the helper in the first
-- place. A list's owner is always also a list_members row (enforced by
-- how lists/memberships are created), so no separate owner-bypass
-- clause is needed here.
-- ---------------------------------------------------------------------
create policy "items_select_list_member"
  on public.items for select
  using (public.is_list_member(list_id));

create policy "items_insert_list_member"
  on public.items for insert
  with check (public.is_list_member(list_id));

create policy "items_update_list_member"
  on public.items for update
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

create policy "items_delete_list_member"
  on public.items for delete
  using (public.is_list_member(list_id));

create policy "categories_select_list_member"
  on public.categories for select
  using (public.is_list_member(list_id));

create policy "categories_insert_list_member"
  on public.categories for insert
  with check (public.is_list_member(list_id));

create policy "categories_update_list_member"
  on public.categories for update
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

create policy "categories_delete_list_member"
  on public.categories for delete
  using (public.is_list_member(list_id));
