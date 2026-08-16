-- Smart Import: category learning generalizes across differently-
-- phrased imports of the same product via the generic merge identity
-- (mergeKey - see src/import/semantic/mergeKey.ts), not just an exact
-- repeat of the original text (see
-- LearningRepository.lookupCategoriesByMergeKey). Indexed the same way
-- original_text already is (idx_user_import_learning_user_text), so
-- this new query pattern doesn't force a sequential scan. Partial
-- (`where merge_key is not null`) since only rows with a mergeKey are
-- ever queried this way, and older rows may still have none.
create index if not exists idx_user_import_learning_user_merge_key
  on public.user_import_learning(user_id, merge_key)
  where merge_key is not null;
