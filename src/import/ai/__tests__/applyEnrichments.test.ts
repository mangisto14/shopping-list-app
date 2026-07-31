import { describe, expect, it } from 'vitest';
import { applyAiEnrichments } from '../applyEnrichments';
import type { AiItemEnrichment, ImportItemCandidate } from '../../types';

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

describe('applyAiEnrichments', () => {
  it('leaves a candidate untouched when it has no matching enrichment', () => {
    const candidates = [candidate({ id: 'c1' })];
    const result = applyAiEnrichments(candidates, []);
    expect(result[0]).toEqual(candidates[0]);
  });

  it('high confidence: writes directly into the real field, no pending value', () => {
    const enrichment: AiItemEnrichment = {
      candidateId: 'c1',
      name: { value: 'חלב 3%', confidence: 'high' },
    };
    const [result] = applyAiEnrichments([candidate({ id: 'c1', name: '  חלב 3%  ' })], [enrichment]);
    expect(result.name).toBe('חלב 3%');
    expect(result.aiPendingName).toBeUndefined();
    expect(result.aiSuggestions?.name).toMatchObject({ confidence: 'high' });
  });

  it('medium confidence: also writes into the real field (for Preview to highlight)', () => {
    const enrichment: AiItemEnrichment = {
      candidateId: 'c1',
      category: { value: { id: 'cat-1', name: 'Dairy' }, confidence: 'medium' },
    };
    const [result] = applyAiEnrichments([candidate({ id: 'c1' })], [enrichment]);
    expect(result.categoryId).toBe('cat-1');
    expect(result.categoryName).toBe('Dairy');
    expect(result.aiPendingCategory).toBeUndefined();
    expect(result.aiSuggestions?.category).toMatchObject({ confidence: 'medium' });
  });

  it('low confidence: never writes into the real field, only the pending one', () => {
    const enrichment: AiItemEnrichment = {
      candidateId: 'c1',
      unit: { value: 'ק"ג', confidence: 'low', reason: 'Common unit for this product' },
    };
    const [result] = applyAiEnrichments([candidate({ id: 'c1', unit: null })], [enrichment]);
    expect(result.unit).toBeNull();
    expect(result.aiPendingUnit).toBe('ק"ג');
    expect(result.aiSuggestions?.unit).toMatchObject({ confidence: 'low' });
  });

  it('carries through ambiguous and duplicate flags without touching any field', () => {
    const enrichment: AiItemEnrichment = {
      candidateId: 'c1',
      ambiguous: true,
      duplicateOfCandidateId: 'c0',
    };
    const [result] = applyAiEnrichments([candidate({ id: 'c1', name: 'x' })], [enrichment]);
    expect(result.aiAmbiguous).toBe(true);
    expect(result.aiDuplicateOfCandidateId).toBe('c0');
    expect(result.name).toBe('x');
  });

  it('applies multiple fields at once independently', () => {
    const enrichment: AiItemEnrichment = {
      candidateId: 'c1',
      name: { value: 'חלב', confidence: 'high' },
      unit: { value: 'ליטר', confidence: 'low' },
      category: { value: { id: 'cat-1', name: 'Dairy' }, confidence: 'medium' },
    };
    const [result] = applyAiEnrichments([candidate({ id: 'c1' })], [enrichment]);
    expect(result.name).toBe('חלב');
    expect(result.aiPendingUnit).toBe('ליטר');
    expect(result.unit).toBeNull();
    expect(result.categoryId).toBe('cat-1');
  });
});
