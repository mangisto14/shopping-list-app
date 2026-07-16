-- Phase 6A: fix Realtime DELETE events being silently dropped for
-- items, categories, and list_members.
--
-- Root cause: these tables use Postgres's default REPLICA IDENTITY
-- (primary key only). For DELETE (and UPDATE's old-row image), logical
-- replication only includes the primary key column(s) in the row data
-- sent to subscribers - not the rest of the row. useRealtimeTable.ts
-- filters every subscription on `list_id=eq.<id>`, but list_id isn't
-- part of the primary key, so for a DELETE event the filter has nothing
-- to compare against and the Realtime server drops the event before it
-- reaches any filtered subscriber. REPLICA IDENTITY FULL includes the
-- complete old row, so the filter can actually evaluate.
--
-- This migration only addresses the DELETE path. INSERT is structurally
-- unaffected by replica identity - the new row is always fully present
-- in the WAL for INSERT regardless of this setting - so the INSERT
-- failure has a different root cause, tracked separately.
--
-- Safe to run repeatedly: setting REPLICA IDENTITY to a value it's
-- already set to is a no-op, not an error. This is a metadata-only
-- change (no table rewrite, no data touched, near-instant regardless of
-- table size).

alter table public.items replica identity full;
alter table public.categories replica identity full;
alter table public.list_members replica identity full;
