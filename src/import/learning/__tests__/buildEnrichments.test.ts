import { describe, expect, it } from 'vitest';
import { correctionsToEnrichments, categoryCorrectionsToEnrichments } from '../buildEnrichments';
import type { ImportItemCandidate, ImportPipelineContext } from '../../types';
import type { LearningCorrection } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [{ id: 'cat-fruit', name: 'פירות' }, { id: 'cat-breakfast', name: 'ארוחות בוקר' }],
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

describe('categoryCorrectionsToEnrichments', () => {
  it('applies a learned category to a candidate matched by mergeKey, at high confidence', () => {
    const byMergeKey = new Map([['קורנפלקס', 'cat-breakfast']]);
    const c = candidate({ rawText: 'קורנפלקס', name: 'קורנפלקס', mergeKey: 'קורנפלקס', categoryId: null });

    const [enrichment] = categoryCorrectionsToEnrichments([c], byMergeKey, context);

    expect(enrichment).toEqual({
      candidateId: 'c1',
      category: { value: { id: 'cat-breakfast', name: 'ארוחות בוקר' }, confidence: 'high', reason: expect.any(String) },
    });
  });

  it('never overrides a category some earlier stage already resolved', () => {
    const byMergeKey = new Map([['קורנפלקס', 'cat-breakfast']]);
    const c = candidate({ mergeKey: 'קורנפלקס', categoryId: 'cat-fruit', categoryName: 'פירות' });

    expect(categoryCorrectionsToEnrichments([c], byMergeKey, context)).toEqual([]);
  });

  it('a stale learned category (no longer in existingCategories) is safely skipped, not applied', () => {
    const byMergeKey = new Map([['קורנפלקס', 'cat-deleted']]);
    const c = candidate({ mergeKey: 'קורנפלקס', categoryId: null });

    expect(categoryCorrectionsToEnrichments([c], byMergeKey, context)).toEqual([]);
  });

  it('a candidate with a different mergeKey (unrelated product) never receives the learned category', () => {
    const byMergeKey = new Map([['קורנפלקס', 'cat-breakfast']]);
    const c = candidate({ rawText: 'חלב', name: 'חלב', mergeKey: 'חלב', categoryId: null });

    expect(categoryCorrectionsToEnrichments([c], byMergeKey, context)).toEqual([]);
  });

  it('a candidate with no mergeKey at all is skipped without crashing', () => {
    const byMergeKey = new Map([['קורנפלקס', 'cat-breakfast']]);
    const c = candidate({ mergeKey: undefined, categoryId: null });

    expect(categoryCorrectionsToEnrichments([c], byMergeKey, context)).toEqual([]);
  });
});
