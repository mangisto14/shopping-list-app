// src/import/ai/applyEnrichments.ts
// Merges a TextUnderstandingEngine's AiAnalysisResult into the
// Validator's candidates, per the confidence rule:
//   high / medium -> the real field is populated (medium is also
//                     tagged so Preview can highlight it more
//                     strongly than high); aiSuggestions[field]
//                     records that a suggestion was applied, for the
//                     "✨" badge.
//   low           -> the real field is left untouched; the value goes
//                     into the matching `aiPending*` field instead,
//                     surfaced in Preview as an explicit "apply
//                     suggestion" action the user must take.
// Kept as a small, independently testable pure function rather than
// inline in ImportService, since this is where "never silently apply
// a low-confidence guess" is actually enforced.
import type { AiItemEnrichment, ImportItemCandidate } from '../types';

export function applyAiEnrichments(
  candidates: ImportItemCandidate[],
  enrichments: AiItemEnrichment[]
): ImportItemCandidate[] {
  const enrichmentByCandidateId = new Map(enrichments.map((e) => [e.candidateId, e]));

  return candidates.map((candidate) => {
    const enrichment = enrichmentByCandidateId.get(candidate.id);
    if (!enrichment) return candidate;

    const next: ImportItemCandidate = { ...candidate };
    const aiSuggestions: NonNullable<ImportItemCandidate['aiSuggestions']> = { ...candidate.aiSuggestions };

    if (enrichment.name && typeof enrichment.name.value === 'string') {
      aiSuggestions.name = { confidence: enrichment.name.confidence, reason: enrichment.name.reason };
      if (enrichment.name.confidence === 'low') next.aiPendingName = enrichment.name.value;
      else next.name = enrichment.name.value;
    }

    if (enrichment.quantity && typeof enrichment.quantity.value === 'number') {
      aiSuggestions.quantity = { confidence: enrichment.quantity.confidence, reason: enrichment.quantity.reason };
      if (enrichment.quantity.confidence === 'low') next.aiPendingQuantity = enrichment.quantity.value;
      else next.quantity = enrichment.quantity.value;
    }

    if (enrichment.unit && typeof enrichment.unit.value === 'string') {
      aiSuggestions.unit = { confidence: enrichment.unit.confidence, reason: enrichment.unit.reason };
      if (enrichment.unit.confidence === 'low') next.aiPendingUnit = enrichment.unit.value;
      else next.unit = enrichment.unit.value;
    }

    if (enrichment.category && typeof enrichment.category.value === 'object' && enrichment.category.value !== null) {
      const categoryValue = enrichment.category.value as { id: string | null; name: string | null };
      aiSuggestions.category = { confidence: enrichment.category.confidence, reason: enrichment.category.reason };
      if (enrichment.category.confidence === 'low') {
        next.aiPendingCategory = categoryValue;
      } else {
        next.categoryId = categoryValue.id;
        next.categoryName = categoryValue.name;
      }
    }

    if (enrichment.notes && typeof enrichment.notes.value === 'string') {
      aiSuggestions.notes = { confidence: enrichment.notes.confidence, reason: enrichment.notes.reason };
      if (enrichment.notes.confidence === 'low') next.aiPendingNotes = enrichment.notes.value;
      else next.notes = enrichment.notes.value;
    }

    if (Object.keys(aiSuggestions).length > 0) next.aiSuggestions = aiSuggestions;
    if (enrichment.ambiguous) next.aiAmbiguous = true;
    if (enrichment.duplicateOfCandidateId) next.aiDuplicateOfCandidateId = enrichment.duplicateOfCandidateId;

    return next;
  });
}
