import { describe, expect, it } from 'vitest';
import { correctionsToEnrichments } from '../buildEnrichments';
import type { ImportItemCandidate, ImportPipelineContext } from '../../types';
import type { LearningCorrection } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [{ id: 'cat-fruit', name: 'פירות' }],
  existingItemNames: [],
};

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: 'קישוא',
    name: 'קישוא',
    quantity: 1,
    unit: null,
    categoryId: null,
    categoryName: null,
    notes: null,
    included: true,
    ...overrides,
  };
}

describe('correctionsToEnrichments', () => {
  it('carries a stored mergeKey through as a plain override on the enrichment', () => {
    const corrections = new Map<string, LearningCorrection>([
      ['קישוא', { categoryId: 'cat-fruit', mergeKey: 'קישוא' }],
    ]);
    const [enrichment] = correctionsToEnrichments([candidate({})], corrections, context);
    expect(enrichment.mergeKey).toBe('קישוא');
  });

  it('leaves mergeKey unset for a legacy correction that has none - applyAiEnrichments falls back to generic derivation', () => {
    const corrections = new Map<string, LearningCorrection>([['קישוא', { categoryId: 'cat-fruit' }]]);
    const [enrichment] = correctionsToEnrichments([candidate({})], corrections, context);
    expect(enrichment.mergeKey).toBeUndefined();
  });
});
