-- Adds list archiving (Lists screen: rename/archive/delete/manage
-- members via a three-dot menu). Purely additive: existing rows all
-- get archived = false, so no existing list changes behavior until
-- someone explicitly archives it. No RLS policy changes needed -
-- `lists_update_owner_only` (already exists) already covers writes to
-- this new column, same as it covers `name`.
alter table public.lists
  add column if not exists archived boolean not null default false;

create index if not exists idx_lists_archived on public.lists(archived);
