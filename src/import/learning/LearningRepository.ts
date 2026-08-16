// src/import/learning/LearningRepository.ts
// The only place that talks to `user_import_learning`. Not a hook (see
// types.ts's `AddItemFn` doc comment for why services in this module
// never are) - it imports the raw `supabase` client directly, the same
// module-level singleton every hook already shares, rather than taking
// one injected.
//
// `original_text` is looked up and stored already NORMALIZED (see
// ai/textUtils's normalizeForComparison) so a lookup is a plain
// equality match with no SQL-side text normalization needed - this
// mirrors exactly how the migration's own column comment describes it.
import { supabase } from '../../supabase/client';
import { normalizeForComparison } from '../ai/textUtils';
import type { LearningCorrection, LearningSource, PendingLearningSave } from './types';

interface LearningRow {
  original_text: string;
  normalized_name: string | null;
  category_id: string | null;
  unit: string | null;
  quantity: number | null;
  merge_key: string | null;
}

interface CategoryByMergeKeyRow {
  merge_key: string | null;
  category_id: string | null;
  updated_at?: string;
}

// Higher number wins. A save may overwrite an existing row only when
// its own priority is >= the existing row's - so 'approved_ai' (1) can
// never clobber an existing 'manual' (2) row, but a same-tier save
// (manual-over-manual, approved_ai-over-approved_ai) is always allowed
// - a user correcting their own prior correction again is completely
// normal and must not be permanently blocked by this rule.
const SOURCE_PRIORITY: Record<LearningSource, number> = { approved_ai: 1, manual: 2 };

function rowToCorrection(row: LearningRow): LearningCorrection {
  const correction: LearningCorrection = {};
  if (row.normalized_name !== null) correction.normalizedName = row.normalized_name;
  if (row.category_id !== null) correction.categoryId = row.category_id;
  if (row.unit !== null) correction.unit = row.unit;
  if (row.quantity !== null) correction.quantity = row.quantity;
  if (row.merge_key != null) correction.mergeKey = row.merge_key;
  return correction;
}

// Per-(user, normalized text) cache, `null` meaning "looked up, no
// correction exists" - so a miss is remembered too and never re-queried
// within the same browser session (STEP7: "Cache learning lookups").
// Bounded with a simple full-clear rather than real LRU eviction: this
// cache exists purely to avoid redundant round-trips within one
// session, not to be a durable store, so an occasional full reset under
// heavy use is a fine, simple trade-off.
const cache = new Map<string, LearningCorrection | null>();
const MAX_CACHE_SIZE = 500;

function cacheKey(userId: string, normalizedText: string): string {
  return `${userId}:${normalizedText}`;
}

function rememberInCache(userId: string, normalizedText: string, correction: LearningCorrection | null) {
  if (cache.size >= MAX_CACHE_SIZE) cache.clear();
  cache.set(cacheKey(userId, normalizedText), correction);
}

// Separate cache for the mergeKey-based category fallback below - a
// plain (mergeKey -> categoryId) map, not a full LearningCorrection, so
// it's kept in its own namespace rather than overloading `cache`'s
// per-(user, exact-text) keying with a second, incompatible meaning.
const mergeKeyCategoryCache = new Map<string, string | null>();

function mergeKeyCacheKey(userId: string, mergeKey: string): string {
  return `${userId}:${mergeKey}`;
}

function rememberCategoryInCache(userId: string, mergeKey: string, categoryId: string | null) {
  if (mergeKeyCategoryCache.size >= MAX_CACHE_SIZE) mergeKeyCategoryCache.clear();
  mergeKeyCategoryCache.set(mergeKeyCacheKey(userId, mergeKey), categoryId);
}

export const learningRepository = {
  // Batched by design (STEP7: "never call AI one item at a time" - the
  // same discipline applies here, one query for the whole import
  // rather than one per line): looks up every text at once, serving
  // whatever it can from the cache first and only querying the rows
  // that are neither cached nor already known misses.
  async lookupMany(userId: string, originalTexts: string[]): Promise<Map<string, LearningCorrection>> {
    const normalizedTexts = Array.from(new Set(originalTexts.map(normalizeForComparison).filter(Boolean)));
    const result = new Map<string, LearningCorrection>();
    const toQuery: string[] = [];

    for (const text of normalizedTexts) {
      const cached = cache.get(cacheKey(userId, text));
      if (cached !== undefined) {
        if (cached) result.set(text, cached);
      } else {
        toQuery.push(text);
      }
    }

    if (toQuery.length > 0) {
      const { data, error } = await supabase
        .from('user_import_learning')
        .select('original_text, normalized_name, category_id, unit, quantity, merge_key')
        .eq('user_id', userId)
        .in('original_text', toQuery);

      if (error) {
        console.error('Smart Import: learning lookup failed, continuing without it', error);
        return result;
      }

      const foundTexts = new Set<string>();
      for (const row of (data ?? []) as LearningRow[]) {
        const correction = rowToCorrection(row);
        result.set(row.original_text, correction);
        rememberInCache(userId, row.original_text, correction);
        foundTexts.add(row.original_text);
      }
      for (const text of toQuery) {
        if (!foundTexts.has(text)) rememberInCache(userId, text, null);
      }
    }

    return result;
  },

  // Generalizes a learned CATEGORY across differently-phrased imports
  // of the same product, via the generic merge identity (mergeKey -
  // see semantic/mergeKey.ts) rather than an exact repeat of the
  // original text - "קורנפלקס גדול" once corrected to a category
  // should still apply to a later, differently-phrased "קורנפלקס",
  // since both share the same product identity. Deliberately
  // CATEGORY-ONLY, unlike lookupMany above: a learned quantity/unit/
  // name is tied to the literal phrasing it was corrected from and
  // must never generalize this way, but a product's category doesn't
  // depend on how much of it you're buying or how you phrased it.
  //
  // ImportService only calls this for candidates lookupMany's
  // exact-text match left without a category - a more specific past
  // correction always takes priority over this more general one.
  async lookupCategoriesByMergeKey(userId: string, mergeKeys: string[]): Promise<Map<string, string>> {
    const uniqueKeys = Array.from(new Set(mergeKeys.filter(Boolean)));
    const result = new Map<string, string>();
    const toQuery: string[] = [];

    for (const key of uniqueKeys) {
      const cached = mergeKeyCategoryCache.get(mergeKeyCacheKey(userId, key));
      if (cached !== undefined) {
        if (cached) result.set(key, cached);
      } else {
        toQuery.push(key);
      }
    }

    if (toQuery.length > 0) {
      const { data, error } = await supabase
        .from('user_import_learning')
        .select('merge_key, category_id, updated_at')
        .eq('user_id', userId)
        .in('merge_key', toQuery);

      if (error) {
        console.error('Smart Import: category learning lookup by merge key failed, continuing without it', error);
        return result;
      }

      // Sorted newest-first client-side (same chain shape as
      // lookupMany above - no server-side ORDER BY to keep the query
      // simple) so the first row seen per key, below, is the most
      // recent correction - "the newest correction wins", same rule
      // saveCorrections' own priority check already applies to the
      // exact-text path.
      const rows = [...((data ?? []) as CategoryByMergeKeyRow[])].sort((a, b) =>
        (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
      );

      const foundKeys = new Set<string>();
      for (const row of rows) {
        if (!row.merge_key || !row.category_id) continue;
        if (foundKeys.has(row.merge_key)) continue;
        result.set(row.merge_key, row.category_id);
        rememberCategoryInCache(userId, row.merge_key, row.category_id);
        foundKeys.add(row.merge_key);
      }
      for (const key of toQuery) {
        if (!foundKeys.has(key)) rememberCategoryInCache(userId, key, null);
      }
    }

    return result;
  },

  // Upserts every save from one import in a SINGLE request (PostgREST
  // accepts an array for a bulk upsert) rather than one round-trip per
  // row - the same "never call one item at a time" discipline STEP7
  // asks of the AI Assistant, applied here too. Keyed by (user_id,
  // original_text), matching the migration's unique constraint.
  //
  // Priority-checked against whatever's already stored (one batched
  // SELECT, same discipline) so a lower-priority 'approved_ai' save can
  // never silently overwrite an existing 'manual' row - see
  // SOURCE_PRIORITY above. This is still only ONE upsert statement:
  // priority-losing entries are filtered out beforehand, not written
  // and then reverted.
  async saveCorrections(userId: string, saves: PendingLearningSave[]): Promise<void> {
    const normalized = saves
      .map((save) => {
        const normalizedText = normalizeForComparison(save.originalText);
        return normalizedText ? { ...save, normalizedText } : null;
      })
      .filter((save): save is PendingLearningSave & { normalizedText: string } => save !== null);

    if (normalized.length === 0) return;

    // Two entries in the same batch can normalize to the same text
    // (e.g. two candidates that both merge into one existing shopping-
    // list item - see ImportService.commit's own merge logic). A
    // single multi-row upsert statement can't target the same conflict
    // key twice, so the later one wins here - same "a later save
    // replaces an earlier one" rule already applied across separate
    // imports, just applied within one batch too.
    const byText = new Map<string, PendingLearningSave & { normalizedText: string }>();
    for (const save of normalized) byText.set(save.normalizedText, save);
    const deduped = [...byText.values()];

    const { data: existingRows, error: selectError } = await supabase
      .from('user_import_learning')
      .select('original_text, source')
      .eq('user_id', userId)
      .in('original_text', deduped.map((save) => save.normalizedText));

    if (selectError) {
      console.error('Smart Import: checking existing learning priority failed, skipping this save', selectError);
      return;
    }

    const existingSourceByText = new Map<string, LearningSource>();
    for (const row of (existingRows ?? []) as { original_text: string; source: LearningSource | null }[]) {
      // A row from before this feature existed (source column just
      // added, no value backfilled yet in a not-yet-migrated
      // environment) really was a manual correction, by construction -
      // that's the only kind that could have been saved back then.
      existingSourceByText.set(row.original_text, row.source ?? 'manual');
    }

    const toUpsert = deduped.filter((save) => {
      const existingSource = existingSourceByText.get(save.normalizedText);
      return !existingSource || SOURCE_PRIORITY[save.source] >= SOURCE_PRIORITY[existingSource];
    });

    if (toUpsert.length === 0) return;

    const rows = toUpsert.map(({ normalizedText, correction, source }) => ({
      user_id: userId,
      original_text: normalizedText,
      normalized_name: correction.normalizedName ?? null,
      category_id: correction.categoryId ?? null,
      unit: correction.unit ?? null,
      quantity: correction.quantity ?? null,
      merge_key: correction.mergeKey ?? null,
      source,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('user_import_learning').upsert(rows, { onConflict: 'user_id,original_text' });

    if (error) {
      console.error('Smart Import: saving learning corrections failed', error);
      return;
    }

    for (const { normalizedText, correction } of toUpsert) {
      rememberInCache(userId, normalizedText, correction);
      // Primes the mergeKey fallback cache too, same "an immediate
      // lookup does not re-query" guarantee lookupMany already gets -
      // only when this save actually carries a positive category (an
      // explicit "no category" correction isn't generalized this way,
      // same scoping as lookupCategoriesByMergeKey's query itself).
      if (correction.mergeKey && correction.categoryId) {
        rememberCategoryInCache(userId, correction.mergeKey, correction.categoryId);
      }
    }
  },
};
