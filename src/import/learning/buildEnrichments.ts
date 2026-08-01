// src/import/learning/buildEnrichments.ts
// Converts a batch of learning-table hits into the pipeline's existing
// AiItemEnrichment shape, so a past correction is applied through the
// exact same applyAiEnrichments() merge every other enrichment source
// uses. Always 'high' confidence - a learning-table row only ever
// exists because the user explicitly corrected it once already (see
// LearningRepository's own doc comment: "never store unchanged
// values"), so there is no honest lower-confidence reading of it.
import { normalizeForComparison } from '../ai/textUtils';
import type { AiItemEnrichment, ImportItemCandidate, ImportPipelineContext } from '../types';
import type { LearningCorrection } from './types';

export function correctionsToEnrichments(
  candidates: ImportItemCandidate[],
  correctionsByNormalizedText: Map<string, LearningCorrection>,
  context: ImportPipelineContext
): AiItemEnrichment[] {
  const enrichments: AiItemEnrichment[] = [];

  for (const candidate of candidates) {
    const correction = correctionsByNormalizedText.get(normalizeForComparison(candidate.rawText));
    if (!correction) continue;

    const enrichment: AiItemEnrichment = { candidateId: candidate.id };

    if (correction.normalizedName) {
      enrichment.name = { value: correction.normalizedName, confidence: 'high', reason: 'From your past correction' };
    }

    if (correction.categoryId) {
      // A category the user picked before may no longer exist (deleted
      // since) - in that case there is nothing honest to suggest, so
      // the field is simply omitted rather than showing a name-less id.
      const category = context.existingCategories.find((c) => c.id === correction.categoryId);
      if (category) {
        enrichment.category = {
          value: { id: category.id, name: category.name },
          confidence: 'high',
          reason: 'From your past correction',
        };
      }
    }

    if (correction.unit) {
      enrichment.unit = { value: correction.unit, confidence: 'high', reason: 'From your past correction' };
    }

    if (correction.quantity !== undefined) {
      enrichment.quantity = { value: correction.quantity, confidence: 'high', reason: 'From your past correction' };
    }

    enrichments.push(enrichment);
  }

  return enrichments;
}
