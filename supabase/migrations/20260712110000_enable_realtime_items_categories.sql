-- Phase 1E: enable Supabase Realtime for items and categories.
-- postgres_changes events only fire for tables explicitly added to the
-- supabase_realtime publication - this is that opt-in. No RLS or data
-- changes here: Realtime respects the existing (Phase 1D) SELECT
-- policies automatically, so a subscriber only receives change events
-- for rows they're already allowed to read.
--
-- Guarded with existence checks so this is safe to rerun: ALTER
-- PUBLICATION ... ADD TABLE errors outright if the table is already a
-- member.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;
