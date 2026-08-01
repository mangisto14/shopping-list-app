// src/import/local/BatchHeuristics.ts
// Two small, always-on, local checks - extracted verbatim from Phase
// 2's HeuristicTextUnderstandingEngine (retired in Phase 2C: its
// name/category/unit guessing is now strictly redundant with the
// knowledge-base-driven SemanticAnalyzer, which is a genuine
// improvement over it - see docs/smart-import-architecture.md's Phase
// 2C section). These two checks were never really "AI" - they're
// plain string algorithms with no network call - so they keep running
// unconditionally, independent of whether Learning or the real AI
// Assistant ran, rather than being folded into either of those.
//
// Deliberately NOT part of AiAssistantSuggestion's shape (see
// ai-assistant/types.ts) - the Phase 2C spec's AI response fields
// (canonical name, category, quantity, unit, notes, confidence, reason)
// don't include ambiguous-flagging or duplicate-detection, so this
// stays exactly what it always was: a local, deterministic, batch-level
// pass over the candidates already produced by the pipeline so far.
import type { AiItemEnrichment, ImportItemCandidate } from '../types';
import { isAmbiguousName, levenshteinDistance, normalizeForComparison } from '../ai/textUtils';

// Within-batch only (against `candidates`, not the list's own existing
// items - Validator's "already on this list" check already covers
// that comparison). Exact normalized match is a strong signal; a close
// edit distance on a long-enough name is a softer one - either way this
// only ever produces a suggestion (`duplicateOfCandidateId`), never an
// automatic merge.
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

export function detectBatchIssues(candidates: ImportItemCandidate[]): AiItemEnrichment[] {
  const duplicateOf = findDuplicateTargets(candidates);

  return candidates
    .map((candidate): AiItemEnrichment => {
      const enrichment: AiItemEnrichment = { candidateId: candidate.id };
      if (isAmbiguousName(candidate.name)) enrichment.ambiguous = true;
      const duplicateTargetId = duplicateOf.get(candidate.id);
      if (duplicateTargetId) enrichment.duplicateOfCandidateId = duplicateTargetId;
      return enrichment;
    })
    .filter((enrichment) => enrichment.ambiguous || enrichment.duplicateOfCandidateId);
}
