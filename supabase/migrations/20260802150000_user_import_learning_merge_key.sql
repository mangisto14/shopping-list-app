-- Smart Import: generic merge identity ("mergeKey" - see
-- src/import/semantic/mergeKey.ts). Nullable, no backfill: an
-- existing row predates this feature and simply has no learned
-- mergeKey yet - LearningRepository/applyAiEnrichments already treat a
-- missing value as "derive it generically instead" (see
-- applyEnrichments.ts's withMergeKey), so old rows keep working
-- exactly as before with zero migration-time computation needed.
alter table public.user_import_learning
  add column if not exists merge_key text;
