-- Automatic learning from user approvals: distinguishes a row the user
-- explicitly typed a correction for ('manual') from one they merely
-- left untouched in Preview - an implicit approval of whatever
-- Semantic Analysis/Learning/the AI Assistant already resolved
-- ('approved_ai'). Both are equally valid for LOOKUP purposes (see
-- LearningRepository.lookupMany, unchanged), but only for WRITE
-- priority: a lower-priority 'approved_ai' save must never silently
-- overwrite an existing 'manual' row (see LearningRepository.
-- saveCorrections's SOURCE_PRIORITY).
--
-- `not null default 'manual'` backfills every row that already exists
-- (all of them, by construction: this column didn't exist before this
-- feature, so every prior row really was a manual correction) without
-- a separate UPDATE statement.
alter table public.user_import_learning
  add column if not exists source text not null default 'manual';

alter table public.user_import_learning
  drop constraint if exists user_import_learning_source_check;
alter table public.user_import_learning
  add constraint user_import_learning_source_check check (source in ('manual', 'approved_ai'));
