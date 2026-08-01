-- Smart Import (Phase 2C): a per-user "learning" table. Stores ONLY
-- corrections the user actually made in Preview after an import - it
-- is never written to for an AI/heuristic suggestion the user simply
-- accepted as-is (see the app-level LearningRepository.saveCorrection,
-- which only calls this table when at least one field genuinely
-- differs from what the pipeline produced).
--
-- `original_text` is stored already NORMALIZED (trimmed, lowercased,
-- whitespace-collapsed - see src/import/ai/textUtils.ts's
-- normalizeForComparison) rather than the raw pasted line, so a later
-- lookup for the same phrase is a plain equality match with no SQL-side
-- text normalization needed.
--
-- `quantity` is not in the original suggested field list, but STEP5 of
-- the spec explicitly requires learning from quantity corrections too
-- (alongside category/unit/product name) - added here so that
-- requirement is actually satisfiable, rather than silently dropped.
--
-- User-scoped, not list-scoped: a correction like "קישוא -> פירות" is
-- about how one user personally shops, not about any one list, so it
-- should apply across every list they import into - same reasoning
-- the existing `history` table already uses (see initial_schema.sql).
create table if not exists public.user_import_learning (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_text text not null,
  normalized_name text,
  category_id uuid references public.categories(id) on delete set null,
  unit text,
  quantity integer,
  updated_at timestamptz not null default now(),
  -- One row per (user, phrase): a later correction for the same
  -- phrase replaces the earlier one (see saveCorrection's upsert)
  -- rather than accumulating a history of every past correction.
  unique (user_id, original_text)
);

-- Matches the suggested index exactly - already implied by the unique
-- constraint above (Postgres backs a unique constraint with an index),
-- but declared explicitly so the intent reads clearly on its own.
create index if not exists idx_user_import_learning_user_text
  on public.user_import_learning(user_id, original_text);

alter table public.user_import_learning enable row level security;

drop policy if exists "user_import_learning_select_own" on public.user_import_learning;
create policy "user_import_learning_select_own"
  on public.user_import_learning for select
  using (auth.uid() = user_id);

drop policy if exists "user_import_learning_insert_own" on public.user_import_learning;
create policy "user_import_learning_insert_own"
  on public.user_import_learning for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_import_learning_update_own" on public.user_import_learning;
create policy "user_import_learning_update_own"
  on public.user_import_learning for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_import_learning_delete_own" on public.user_import_learning;
create policy "user_import_learning_delete_own"
  on public.user_import_learning for delete
  using (auth.uid() = user_id);
