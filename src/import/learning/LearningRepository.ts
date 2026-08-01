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
import type { LearningCorrection } from './types';

interface LearningRow {
  original_text: string;
  normalized_name: string | null;
  category_id: string | null;
  unit: string | null;
  quantity: number | null;
}

function rowToCorrection(row: LearningRow): LearningCorrection {
  const correction: LearningCorrection = {};
  if (row.normalized_name !== null) correction.normalizedName = row.normalized_name;
  if (row.category_id !== null) correction.categoryId = row.category_id;
  if (row.unit !== null) correction.unit = row.unit;
  if (row.quantity !== null) correction.quantity = row.quantity;
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
        .select('original_text, normalized_name, category_id, unit, quantity')
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

  // Upserts one correction, keyed by (user_id, original_text) - a later
  // correction for the same phrase replaces the earlier one, matching
  // the migration's unique constraint. Only ever called with fields
  // that actually changed (see ImportService.saveLearning) - never
  // writes an unchanged AI/rule-based suggestion.
  async saveCorrection(userId: string, originalText: string, correction: LearningCorrection): Promise<void> {
    const normalizedText = normalizeForComparison(originalText);
    if (!normalizedText) return;

    const { error } = await supabase.from('user_import_learning').upsert(
      {
        user_id: userId,
        original_text: normalizedText,
        normalized_name: correction.normalizedName ?? null,
        category_id: correction.categoryId ?? null,
        unit: correction.unit ?? null,
        quantity: correction.quantity ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,original_text' }
    );

    if (error) {
      console.error('Smart Import: saving a learning correction failed', error);
      return;
    }

    rememberInCache(userId, normalizedText, correction);
  },
};
