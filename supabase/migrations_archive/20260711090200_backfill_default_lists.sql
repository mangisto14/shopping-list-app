-- Phase 1B: backfill a default personal list for every existing user, and
-- link their existing items/categories to it.
--
-- Idempotent by design:
--   * Step 1 only creates a list for a user who does not already own one.
--   * Step 2 uses ON CONFLICT on the (list_id, user_id) unique constraint.
--   * Steps 3-4 only touch rows where list_id is still null.
-- Re-running this file after a partial or full success is safe and will not
-- create duplicate lists, duplicate memberships, or reassign already-linked rows.

-- Step 1: every existing user gets exactly one default list, if they don't
-- already own one.
insert into public.lists (name, owner_id)
select 'My List', u.id
from auth.users u
where not exists (
  select 1 from public.lists l where l.owner_id = u.id
);

-- Step 2: every list owner is also recorded as a member of their own list.
insert into public.list_members (list_id, user_id)
select l.id, l.owner_id
from public.lists l
on conflict (list_id, user_id) do nothing;

-- Step 3: link existing items to the list owned by their current user_id.
update public.items i
set list_id = l.id
from public.lists l
where i.user_id = l.owner_id
  and i.list_id is null;

-- Step 4: link existing categories to the list owned by their current user_id.
update public.categories c
set list_id = l.id
from public.lists l
where c.user_id = l.owner_id
  and c.list_id is null;
