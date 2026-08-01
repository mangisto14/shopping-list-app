// src/import/ai-assistant/buildEnrichments.ts
// Converts an AiAssistantResult's suggestions into the pipeline's
// existing AiItemEnrichment shape, reusing the exact same
// applyAiEnrichments() merge function every earlier enrichment source
// (Semantic Analysis, Learning Lookup) already uses - so the AI
// Assistant's results show up in Preview through the same badges/
// pending-suggestion UI with zero Preview code changes (STEP4: "Reuse
// the current Preview").
import { resolveCategoryId } from '../shared/resolveCategoryId';
import type { AiItemEnrichment, ImportPipelineContext } from '../types';
import type { AiAssistantSuggestion } from './types';

export function suggestionsToEnrichments(
  suggestions: AiAssistantSuggestion[],
  context: ImportPipelineContext
): AiItemEnrichment[] {
  return suggestions.map((suggestion): AiItemEnrichment => {
    const enrichment: AiItemEnrichment = { candidateId: suggestion.candidateId };

    if (suggestion.canonicalName) {
      enrichment.name = {
        value: suggestion.canonicalName.value,
        confidence: suggestion.canonicalName.confidence,
        reason: suggestion.reason,
      };
    }

    if (suggestion.category) {
      enrichment.category = {
        // The category NAME is trusted as-is (the Edge Function itself
        // already re-validated it's one of the exact names sent in the
        // request - see schema.ts's sanitizeSuggestion). The real,
        // attachable id is still resolved the same way every other
        // enrichment source resolves it: only if a category with that
        // exact name already exists on this user's list.
        value: { id: resolveCategoryId(suggestion.category.value, context), name: suggestion.category.value },
        confidence: suggestion.category.confidence,
        reason: suggestion.reason,
      };
    }

    if (suggestion.quantity) {
      enrichment.quantity = {
        value: suggestion.quantity.value,
        confidence: suggestion.quantity.confidence,
        reason: suggestion.reason,
      };
    }

    if (suggestion.unit) {
      enrichment.unit = { value: suggestion.unit.value, confidence: suggestion.unit.confidence, reason: suggestion.reason };
    }

    if (suggestion.notes) {
      enrichment.notes = { value: suggestion.notes.value, confidence: suggestion.notes.confidence, reason: suggestion.reason };
    }

    return enrichment;
  });
}
