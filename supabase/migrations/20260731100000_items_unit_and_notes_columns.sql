-- Smart Import (Phase 1): adds `unit` and `notes` to `items` so the
-- Import Preview's unit/notes fields have somewhere real to persist,
-- instead of being edited in the UI and silently discarded on commit.
-- Purely additive: both columns are nullable with no default-value
-- backfill, so every existing row and every existing insert/update
-- call site (none of which reference these columns) is unaffected.
-- No RLS policy change needed - `items_update_list_member` and
-- `items_insert_list_member` (already exist) already cover writes to
-- any column on this table, same as they already cover `is_done`/
-- `position`/`category_id`.
alter table public.items
  add column if not exists unit text,
  add column if not exists notes text;
