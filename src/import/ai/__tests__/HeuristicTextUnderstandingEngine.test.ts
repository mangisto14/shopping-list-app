import { describe, expect, it } from 'vitest';
import { heuristicTextUnderstandingEngine } from '../HeuristicTextUnderstandingEngine';
import type { ImportItemCandidate, ImportPipelineContext } from '../../types';

const context: ImportPipelineContext = {
  existingCategories: [
    { id: 'cat-dairy', name: 'מוצרי חלב' },
    { id: 'cat-veg', name: 'ירקות' },
  ],
  existingItemNames: [],
};

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: 'raw',
    name: 'item',
    quantity: 1,
    unit: null,
    categoryId: null,
    categoryName: null,
    notes: null,
    included: true,
    ...overrides,
  };
}

describe('heuristicTextUnderstandingEngine', () => {
  it('is always available and never calls any network/AI API', () => {
    expect(heuristicTextUnderstandingEngine.isAvailable()).toBe(true);
    expect(heuristicTextUnderstandingEngine.analyze.toString()).not.toMatch(/fetch\(|XMLHttpRequest/);
  });

  it('suggests a high-confidence tidied name when there is stray whitespace/punctuation', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: '  - חלב 3%  ,' })],
      context
    );
    const enrichment = result.enrichments.find((e) => e.candidateId === 'c1');
    expect(enrichment?.name).toMatchObject({ value: 'חלב 3%', confidence: 'high' });
  });

  it('does not suggest a name change when there is nothing to tidy', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze([candidate({ id: 'c1', name: 'חלב' })], context);
    const enrichment = result.enrichments.find((e) => e.candidateId === 'c1');
    expect(enrichment?.name).toBeUndefined();
  });

  it('suggests a low-confidence unit only when unit is missing', async () => {
    const withoutUnit = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'עגבניות', unit: null })],
      context
    );
    expect(withoutUnit.enrichments.find((e) => e.candidateId === 'c1')?.unit).toMatchObject({
      value: 'ק"ג',
      confidence: 'low',
    });

    const withUnit = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'עגבניות', unit: 'ק"ג' })],
      context
    );
    expect(withUnit.enrichments.find((e) => e.candidateId === 'c1')?.unit).toBeUndefined();
  });

  it('suggests a medium-confidence category via word-token overlap, only when categoryId is missing', async () => {
    const withoutCategory = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'חלב 3%', categoryId: null })],
      context
    );
    expect(withoutCategory.enrichments.find((e) => e.candidateId === 'c1')?.category).toMatchObject({
      value: { id: 'cat-dairy', name: 'מוצרי חלב' },
      confidence: 'medium',
    });

    const withCategory = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'חלב 3%', categoryId: 'cat-dairy', categoryName: 'מוצרי חלב' })],
      context
    );
    expect(withCategory.enrichments.find((e) => e.candidateId === 'c1')?.category).toBeUndefined();
  });

  it('flags a name with no real letters as ambiguous, leaves a normal name unflagged', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: '123' }), candidate({ id: 'c2', name: 'שוקולד' })],
      context
    );
    expect(result.enrichments.find((e) => e.candidateId === 'c1')?.ambiguous).toBe(true);
    // 'שוקולד' (chocolate) doesn't match any unit/category keyword, so
    // this candidate gets no enrichment at all - a cleaner way to
    // assert "not ambiguous" than a name that happens to also trigger
    // other, unrelated suggestions (e.g. 'חלב' also matches the unit/
    // category lookups, which is correct, just not what this test cares about).
    expect(result.enrichments.find((e) => e.candidateId === 'c2')).toBeUndefined();
  });

  it('flags an exact within-batch duplicate (case/whitespace-insensitive)', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'חלב' }), candidate({ id: 'c2', name: '  חלב  ' })],
      context
    );
    expect(result.enrichments.find((e) => e.candidateId === 'c2')?.duplicateOfCandidateId).toBe('c1');
    expect(result.enrichments.find((e) => e.candidateId === 'c1')?.duplicateOfCandidateId).toBeUndefined();
  });

  it('flags a near-duplicate within edit-distance 2 on a long-enough name', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'עגבניה' }), candidate({ id: 'c2', name: 'עגבניות' })],
      context
    );
    expect(result.enrichments.find((e) => e.candidateId === 'c2')?.duplicateOfCandidateId).toBe('c1');
  });

  it('does not flag unrelated names as duplicates', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'חלב' }), candidate({ id: 'c2', name: 'לחם' })],
      context
    );
    expect(result.enrichments.find((e) => e.candidateId === 'c2')?.duplicateOfCandidateId).toBeUndefined();
  });

  it('never touches quantity, spelling, or notes - explicitly deferred to a real AI-backed engine', async () => {
    const result = await heuristicTextUnderstandingEngine.analyze(
      [candidate({ id: 'c1', name: 'מלפפnoim', quantity: 1 })],
      context
    );
    const enrichment = result.enrichments.find((e) => e.candidateId === 'c1');
    expect(enrichment?.quantity).toBeUndefined();
    expect(enrichment?.notes).toBeUndefined();
  });
});
