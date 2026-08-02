// src/import/semantic/SemanticAnalyzer.ts
// Combines parseQuantity.ts + knowledge/KnowledgeMatcher.ts into one
// enrichment per candidate, reusing the exact same `AiItemEnrichment`
// shape (and the exact same applyAiEnrichments() merge function)
// Phase 2's AI Analysis stage already established - so this stage's
// results show up in Preview via the SAME badges/pending-suggestion UI
// with zero Preview code changes, per the Phase 2B "do not change
// Import UI/Preview" constraint.
//
// Deliberately re-parses `candidate.rawText` (the original, untouched
// line) rather than reading `candidate.name` - RuleBasedNormalizer may
// already have stripped a quantity/unit token out of the name before
// this stage ever runs, so re-parsing the ORIGINAL text is what lets
// this recognize formats RuleBasedNormalizer's own (narrower) regexes
// miss, like a trailing bare quantity ("מלפפון 3").
//
// This never calls Claude/OpenAI/Gemini/OCR or any network API - every
// answer here comes from parseQuantity.ts (plain regex/tokenization)
// and the knowledge base (a static, in-memory lookup, loaded once).
import type { AiItemEnrichment, ConfidenceLevel, ImportItemCandidate, ImportPipelineContext } from '../types';
import { matchProduct, type ProductMatchTier } from '../knowledge/KnowledgeMatcher';
import { resolveCategoryId } from '../shared/resolveCategoryId';
import { parseQuantity } from './parseQuantity';

// Whether - and at what confidence - a resolved canonical name should
// replace `candidate.name`. Deliberately keyed off the match TIER, not
// KnowledgeMatcher's `nameConfidence` field: that field only answers
// "is the *matched product portion* already spelled canonically",
// which is a different question from "does the candidate's full name
// field already equal the canonical spelling". They diverge whenever
// RuleBasedNormalizer's own (narrower) regexes fail to strip a
// quantity out of the name - e.g. "מלפפון 3" has no unit and a
// trailing bare quantity, a format only this stage's parseQuantity
// recognizes, so RuleBasedNormalizer leaves the whole raw line as the
// name. In that case the product portion resolves at 'exact-product'
// tier (מלפפון is already canonical) but `candidate.name` is still
// "מלפפון 3" - very much in need of a rename. 'keyword'/'existing-
// category' tiers never rename regardless (see KnowledgeMatcher.ts's
// tier doc comment - a partial/token match isn't a strong enough
// signal to rewrite the whole name).
function renameConfidenceForTier(tier: ProductMatchTier): ConfidenceLevel | null {
  if (tier === 'exact-product' || tier === 'alias') return 'high';
  if (tier === 'fuzzy') return 'low';
  return null;
}

function enrichmentIsEmpty(enrichment: AiItemEnrichment): boolean {
  return !enrichment.name && !enrichment.quantity && !enrichment.unit && !enrichment.category;
}

export function analyzeCandidate(candidate: ImportItemCandidate, context: ImportPipelineContext): AiItemEnrichment {
  const enrichment: AiItemEnrichment = { candidateId: candidate.id };

  const parsed = parseQuantity(candidate.rawText);
  const match = matchProduct(parsed.remainingText, context);

  // Quantity/unit parsed directly out of the raw text are `high`
  // confidence - this isn't a guess, it's what the user actually
  // typed. Only emitted when it differs from what's already resolved,
  // so a row RuleBasedNormalizer already parsed correctly doesn't get
  // a redundant "AI touched this" badge.
  if (parsed.quantityFound && parsed.quantity !== candidate.quantity) {
    enrichment.quantity = { value: parsed.quantity, confidence: 'high', reason: 'Parsed directly from the text' };
  }

  if (parsed.unitFound && parsed.unit && parsed.unit !== candidate.unit) {
    enrichment.unit = { value: parsed.unit, confidence: 'high', reason: 'Parsed directly from the text' };
  } else if (!parsed.unitFound && !candidate.unit && match.defaultUnit) {
    // No unit in the text at all - fall back to the knowledge base's
    // typical unit for this product, but only ever as a low-confidence
    // (pending, never auto-applied) suggestion - it's a guess about
    // the *product*, not derived from what the user actually typed.
    enrichment.unit = { value: match.defaultUnit, confidence: 'low', reason: 'Typical unit for this product' };
  }

  const renameConfidence = renameConfidenceForTier(match.matchTier);
  if (renameConfidence && match.canonicalName && match.canonicalName !== candidate.name) {
    enrichment.name = { value: match.canonicalName, confidence: renameConfidence, reason: 'Recognized product name' };
  } else if ((parsed.quantityFound || parsed.unitFound) && parsed.remainingText && parsed.remainingText !== candidate.name) {
    // The product isn't recognized by the knowledge base (unknown to
    // KNOWLEDGE_PRODUCTS entirely, or only a partial/keyword match too
    // weak to justify a full canonicalization - see the tier doc
    // comment above), but a quantity/unit WAS genuinely parsed out of
    // the raw text. "The stored item name must never contain embedded
    // quantity values" is unconditional - it doesn't depend on the
    // product being recognized - so the merely-cleaned (quantity/unit
    // stripped, whitespace-normalized) text is still used as a
    // fallback rename, at high confidence: this isn't a guess about
    // what the product is, it's a mechanical fact about what's left
    // over after removing the exact tokens `parsed` already found.
    //
    // Gated on quantityFound/unitFound specifically (not just "does
    // remainingText differ from candidate.name") so this can never
    // fire when parseQuantity found nothing to strip - e.g. a line
    // RuleBasedNormalizer already split into name + notes ("חלב - קנה
    // את הדל שומן") re-parsed here from the full original rawText
    // (which still includes the notes suffix) must not have that notes
    // text reintroduced into the name.
    enrichment.name = { value: parsed.remainingText, confidence: 'high', reason: 'Quantity/unit removed from name' };
  }

  if (!candidate.categoryId && match.categoryName && match.categoryConfidence) {
    enrichment.category = {
      value: { id: resolveCategoryId(match.categoryName, context), name: match.categoryName },
      confidence: match.categoryConfidence,
      reason: `Category from knowledge base (${match.matchTier})`,
    };
  }

  return enrichment;
}

export function analyzeCandidates(
  candidates: ImportItemCandidate[],
  context: ImportPipelineContext
): AiItemEnrichment[] {
  return candidates
    .map((candidate) => analyzeCandidate(candidate, context))
    .filter((enrichment) => !enrichmentIsEmpty(enrichment));
}
