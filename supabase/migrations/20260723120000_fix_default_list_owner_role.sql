-- Fix: create_default_list_for_user() inserted the owner's own
-- list_members row without setting role, so it silently defaulted to
-- 'member' (see 20260714120000's column default). isOwner in
-- useMembers.ts reads that role column, not lists.owner_id, so this
-- made every new user's own default list look owner-less to the
-- frontend - specifically hiding FamilyHeroCard's invite button
-- (showInvite={isOwner}) on the /family page. is_list_owner() itself
-- was never affected (it checks lists.owner_id directly), so RLS and
-- invite_member_by_email were unaffected - this was a frontend-facing
-- bug only.
--
-- Redefines the function rather than editing the original migration
-- file, same as 20260714120000 and 20260718090000 already did for this
-- same function - already-applied migrations must not be edited in
-- place.
--
-- Existing rows are intentionally left untouched here - a backfill for
-- already-created lists is a separate, deliberately deferred change.
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

  insert into public.list_members (list_id, user_id, role)
  values (new_list_id, p_user_id, 'owner');
end;
$$;
