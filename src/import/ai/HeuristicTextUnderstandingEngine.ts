// src/import/ai/HeuristicTextUnderstandingEngine.ts
// Phase 2's only real TextUnderstandingEngine implementation.
// Deliberately NOT AI/vendor-backed - no network call, nothing here
// even hints at which AI provider a future implementation might use.
// It satisfies the same interface a real AI-backed engine will later
// satisfy (see types.ts's TextUnderstandingEngine doc comment) -
// swapping one in is a registration change, not an ImportService
// change. This is also the "AI unavailable" fallback path in spirit:
// if a real engine is ever added and fails/is disabled, the pipeline
// already works today with no engine at all (see registerAiEngines.ts
// and ImportService's fail-safe handling).
//
// What this genuinely does, for real, with plain string algorithms:
//   - tidies whitespace/stray punctuation in names (high confidence -
//     this can never change meaning, so it's safe to auto-apply)
//   - suggests a category via word-token overlap with existing
//     category names (medium confidence) - a real improvement over
//     RuleBasedNormalizer's plain substring check (e.g. category
//     "מוצרי חלב" now matches an item named "חלב 3%", which a
//     substring check on the full category name misses)
//   - guesses a common unit from a small keyword lookup when one is
//     missing (low confidence - it's a guess about the *product*, not
//     derived from what the user actually typed, so it's never
//     auto-applied - see commonUnits.ts)
//   - flags ambiguous (too short / no real letters) names
//   - flags likely duplicates/near-duplicates within the same import
//     batch via edit distance - always a suggestion, never an
//     automatic merge
//
// What this deliberately does NOT do, and why: real spelling
// correction and generating a genuinely useful note both require
// actual language understanding. A heuristic can't do either honestly
// without fabricating output that looks smarter than it is - both are
// left for a real AI-backed engine to implement against this same
// interface, rather than faked here.
import type {
  AiAnalysisResult,
  AiItemEnrichment,
  ConfidenceLevel,
  ImportItemCandidate,
  ImportPipelineContext,
  TextUnderstandingEngine,
} from '../types';
import { guessUnitFromName } from './commonUnits';
import { isAmbiguousName, levenshteinDistance, normalizeForComparison, tokenize } from './textUtils';

// Strips stray leading/trailing quote marks, dashes, and commas left
// over from parsing, and collapses internal whitespace. Never touches
// letters, so it can't introduce a spelling change - safe to
// auto-apply at high confidence.
const STRAY_PUNCTUATION_RE = /^[\s'"“”׳״\-,.]+|[\s'"“”׳״\-,.]+$/g;

function tidyName(name: string): string {
  return name.replace(/\s+/g, ' ').replace(STRAY_PUNCTUATION_RE, '').trim();
}

function suggestCategory(
  name: string,
  existingCategories: ImportPipelineContext['existingCategories']
): { id: string; name: string } | null {
  const nameTokens = new Set(tokenize(name));
  for (const category of existingCategories) {
    if (tokenize(category.name).some((token) => nameTokens.has(token))) {
      return category;
    }
  }
  return null;
}

// Within-batch only (against `candidates`, not the list's existing
// items - Validator's own "already on this list" check already covers
// that comparison). Exact normalized match is a strong signal (high);
// a close edit distance on a long-enough name is a softer one
// (medium) - either way this only ever produces a suggestion
// (`duplicateOfCandidateId`), never an automatic merge.
function findDuplicateTargets(candidates: ImportItemCandidate[]): Map<string, string> {
  const duplicateOf = new Map<string, string>();

  for (let i = 0; i < candidates.length; i++) {
    if (duplicateOf.has(candidates[i].id)) continue;
    const a = normalizeForComparison(candidates[i].name);
    if (!a) continue;

    for (let j = 0; j < i; j++) {
      const b = normalizeForComparison(candidates[j].name);
      if (!b) continue;

      const maxLen = Math.max(a.length, b.length);
      const closeEnough = a === b || (maxLen >= 4 && levenshteinDistance(a, b) <= 2);
      if (closeEnough) {
        duplicateOf.set(candidates[i].id, candidates[j].id);
        break;
      }
    }
  }

  return duplicateOf;
}

function enrichmentIsEmpty(enrichment: AiItemEnrichment): boolean {
  return (
    !enrichment.name &&
    !enrichment.quantity &&
    !enrichment.unit &&
    !enrichment.category &&
    !enrichment.notes &&
    !enrichment.ambiguous &&
    !enrichment.duplicateOfCandidateId
  );
}

export const heuristicTextUnderstandingEngine: TextUnderstandingEngine = {
  id: 'heuristic',
  isAvailable: () => true,
  async analyze(candidates: ImportItemCandidate[], context: ImportPipelineContext): Promise<AiAnalysisResult> {
    const duplicateOf = findDuplicateTargets(candidates);

    const enrichments = candidates
      .map((candidate): AiItemEnrichment => {
        const enrichment: AiItemEnrichment = { candidateId: candidate.id };
        const tidied = tidyName(candidate.name);

        if (tidied && tidied !== candidate.name) {
          const confidence: ConfidenceLevel = 'high';
          enrichment.name = { value: tidied, confidence, reason: 'Whitespace/punctuation cleanup' };
        }

        if (!candidate.unit) {
          const guessedUnit = guessUnitFromName(tidied || candidate.name);
          if (guessedUnit) {
            enrichment.unit = { value: guessedUnit, confidence: 'low', reason: 'Common unit for this product' };
          }
        }

        if (!candidate.categoryId) {
          const guessedCategory = suggestCategory(tidied || candidate.name, context.existingCategories);
          if (guessedCategory) {
            enrichment.category = {
              value: guessedCategory,
              confidence: 'medium',
              reason: 'Matches an existing category',
            };
          }
        }

        if (isAmbiguousName(candidate.name)) {
          enrichment.ambiguous = true;
        }

        const duplicateTargetId = duplicateOf.get(candidate.id);
        if (duplicateTargetId) {
          enrichment.duplicateOfCandidateId = duplicateTargetId;
        }

        return enrichment;
      })
      .filter((enrichment) => !enrichmentIsEmpty(enrichment));

    return { engineId: 'heuristic', enrichments, warnings: [] };
  },
};
