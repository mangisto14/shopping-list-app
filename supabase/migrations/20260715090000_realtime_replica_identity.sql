-- PHASE 6A Realtime Fix.
--
-- Deletes (and, in principle, updates) on items/categories/list_members
-- were not propagating over Realtime to other list members. Root cause:
-- none of these tables had REPLICA IDENTITY FULL set, so Postgres's
-- default replica identity (primary key only, i.e. just `id`) meant the
-- WAL's old-row data for UPDATE/DELETE never included `list_id`. Realtime's
-- server-side `filter: list_id=eq.<listId>` (see useRealtimeTable.ts) has
-- nothing to match against in that case and silently drops the event
-- instead of delivering it - so a member removing an item never showed
-- up live for anyone else, only after their next full refetch.
--
-- Purely additive at the storage level: this only changes what Postgres
-- includes in the WAL for UPDATE/DELETE old-row data. No column, table,
-- policy, or grant is touched.
alter table public.items replica identity full;
alter table public.categories replica identity full;
alter table public.list_members replica identity full;
