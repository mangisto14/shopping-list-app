// src/import/knowledge/KnowledgeMatcher.ts
// Resolves a raw product-name string (already stripped of quantity/
// unit by src/import/semantic/parseQuantity.ts) against the knowledge
// base, in strict priority order (see the ProductMatchResult doc
// comment below for what each tier means and what confidence it gets).
//
// Category NAME is resolved here whenever a product is recognized at
// all (tiers other than 'none'/'existing-category' come with a known
// category attached). The REAL categoryId - only usable if a matching
// category already exists in the user's own list - is deliberately
// NOT decided here: that requires ImportPipelineContext.existingCategories,
// which callers already have, so SemanticAnalyzer.ts resolves it right
// before building the enrichment. This keeps this module's output pure
// knowledge-base data, uncoupled from any one user's real categories.
import { levenshteinDistance, normalizeForComparison, tokenize } from '../ai/textUtils';
import type { ConfidenceLevel, ImportPipelineContext } from '../types';
import { knowledgeBase } from './KnowledgeBase';
import type { KnowledgeProduct } from './products';

export type ProductMatchTier = 'exact-product' | 'alias' | 'keyword' | 'existing-category' | 'fuzzy' | 'none';

export interface ProductMatchResult {
  // The recognized canonical product name, or null if none was found.
  canonicalName: string | null;
  // Confidence for RENAMING the item to `canonicalName`. Only set when
  // a rename is actually being suggested (tiers 'alias' and 'fuzzy') -
  // 'exact-product'/'keyword' matches don't need a rename (the name is
  // already canonical, or only a partial/token match was found), so
  // this is null for those, and callers must not emit a name
  // enrichment when it's null.
  nameConfidence: ConfidenceLevel | null;
  matchTier: ProductMatchTier;
  defaultUnit: string | null;
  categoryName: string | null;
  // Deliberately capped at 'medium' even for an exact product match:
  // a category is a judgment call (the same product can reasonably
  // belong to more than one store section), so this module never
  // claims 'high' confidence for it - only QUANTITY/UNIT values parsed
  // directly out of the raw text itself (see parseQuantity.ts) warrant
  // 'high'. 'low' (fuzzy tier) means "never auto-apply this category"
  // per the pipeline's existing confidence rule - it still gets
  // surfaced as a pending suggestion, just never silently written in.
  categoryConfidence: ConfidenceLevel | null;
}

const NONE_RESULT: ProductMatchResult = {
  canonicalName: null,
  nameConfidence: null,
  matchTier: 'none',
  defaultUnit: null,
  categoryName: null,
  categoryConfidence: null,
};

// Fuzzy matches shorter than this are rejected outright - mirrors
// HeuristicTextUnderstandingEngine's own duplicate-detection guard
// (see findDuplicateTargets in HeuristicTextUnderstandingEngine.ts),
// since edit distance on very short strings is dominated by noise.
const MIN_FUZZY_LENGTH = 4;
const MAX_FUZZY_DISTANCE = 2;

export function matchProduct(rawName: string, context: ImportPipelineContext): ProductMatchResult {
  const normalized = normalizeForComparison(rawName);
  if (!normalized) return NONE_RESULT;

  // Tier 1 + 2: exact match against a full canonical name or alias
  // (including generated brand combos) - a plain Map lookup, so a
  // short alias can never partial-match inside a longer unrelated word.
  const exact = knowledgeBase.lookupExactOrAlias(normalized);
  if (exact) {
    const isCanonicalAlready = normalizeForComparison(exact.canonicalName) === normalized;
    return {
      canonicalName: exact.canonicalName,
      nameConfidence: isCanonicalAlready ? null : 'high',
      matchTier: isCanonicalAlready ? 'exact-product' : 'alias',
      defaultUnit: exact.defaultUnit,
      categoryName: exact.category,
      categoryConfidence: 'medium',
    };
  }

  // Tier 3a: any single whole token of the raw name is itself an exact
  // product/alias match (e.g. "חלב 3%" -> token "חלב"). Deliberately
  // does NOT suggest a rename - only the category/unit are usable
  // signals here, since the rest of the text wasn't accounted for.
  for (const token of tokenize(rawName)) {
    const tokenMatch = knowledgeBase.lookupExactOrAlias(token);
    if (tokenMatch) {
      return {
        canonicalName: tokenMatch.canonicalName,
        nameConfidence: null,
        matchTier: 'keyword',
        defaultUnit: tokenMatch.defaultUnit,
        categoryName: tokenMatch.category,
        categoryConfidence: 'medium',
      };
    }
  }

  // Tier 3b: a product's `keywords` substring appears in the raw name
  // (e.g. "עגבני" catches "עגבניות"/"עגבנייה" without enumerating every
  // inflection as a full alias).
  for (const product of knowledgeBase.getAllProducts()) {
    if (product.keywords?.some((keyword) => normalized.includes(normalizeForComparison(keyword)))) {
      return {
        canonicalName: product.canonicalName,
        nameConfidence: null,
        matchTier: 'keyword',
        defaultUnit: product.defaultUnit,
        categoryName: product.category,
        categoryConfidence: 'medium',
      };
    }
  }

  // Tier 4: the raw name textually contains one of the user's OWN real
  // category names - independent of the knowledge base's product list
  // entirely. No default unit (there's no recognized product), and no
  // canonical rename.
  for (const category of context.existingCategories) {
    const normalizedCategoryName = normalizeForComparison(category.name);
    if (normalizedCategoryName && normalized.includes(normalizedCategoryName)) {
      return {
        canonicalName: null,
        nameConfidence: null,
        matchTier: 'existing-category',
        defaultUnit: null,
        categoryName: category.name,
        categoryConfidence: 'medium',
      };
    }
  }

  // Tier 5: fuzzy match (small edit distance) against every known
  // product's canonical name and aliases - the weakest signal, so both
  // the rename and the category are only ever offered as low-confidence
  // (pending, never auto-applied) suggestions.
  let best: { product: KnowledgeProduct; distance: number } | null = null;
  for (const product of knowledgeBase.getAllProducts()) {
    for (const candidateName of [product.canonicalName, ...product.aliases]) {
      const normalizedCandidate = normalizeForComparison(candidateName);
      if (!normalizedCandidate) continue;
      const maxLen = Math.max(normalizedCandidate.length, normalized.length);
      if (maxLen < MIN_FUZZY_LENGTH) continue;
      const distance = levenshteinDistance(normalized, normalizedCandidate);
      if (distance <= MAX_FUZZY_DISTANCE && (!best || distance < best.distance)) {
        best = { product, distance };
      }
    }
  }
  if (best) {
    return {
      canonicalName: best.product.canonicalName,
      nameConfidence: 'low',
      matchTier: 'fuzzy',
      defaultUnit: best.product.defaultUnit,
      categoryName: best.product.category,
      categoryConfidence: 'low',
    };
  }

  return NONE_RESULT;
}
