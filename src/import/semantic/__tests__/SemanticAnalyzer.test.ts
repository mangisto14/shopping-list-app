import { describe, expect, it } from 'vitest';
import { analyzeCandidate, analyzeCandidates } from '../SemanticAnalyzer';
import type { ImportItemCandidate, ImportPipelineContext } from '../../types';

const context: ImportPipelineContext = {
  existingCategories: [
    { id: 'cat-dairy', name: 'מוצרי חלב' },
    { id: 'cat-veg', name: 'ירקות' },
  ],
  existingItemNames: [],
};

const emptyContext: ImportPipelineContext = { existingCategories: [], existingItemNames: [] };

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: overrides.name ?? 'item',
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

describe('analyzeCandidate - the 5 required Phase 2B scenarios', () => {
  it('"מלפפון 3" -> quantity 3, category ירקות, name cleaned to מלפפון', () => {
    // RuleBasedNormalizer's own regexes only recognize a LEADING
    // quantity+unit or a leading "Nx"/"N x" multiplier - a trailing
    // bare quantity with no unit at all is a format only this stage's
    // parseQuantity recognizes, so the candidate this stage actually
    // receives still has the raw, unstripped line as its name.
    const c = candidate({ id: 'c1', rawText: 'מלפפון 3', name: 'מלפפון 3', quantity: 1 });
    const enrichment = analyzeCandidate(c, context);
    expect(enrichment.quantity).toMatchObject({ value: 3, confidence: 'high' });
    expect(enrichment.name).toMatchObject({ value: 'מלפפון', confidence: 'high' });
    expect(enrichment.category?.value).toMatchObject({ name: 'ירקות' });
  });

  it('\'2 ק"ג תפוחים\' -> quantity 2, unit ק"ג, category פירות', () => {
    const c = candidate({ id: 'c1', rawText: '2 ק"ג תפוחים', name: 'תפוחים', quantity: 1, unit: null });
    const enrichment = analyzeCandidate(c, emptyContext);
    expect(enrichment.quantity).toMatchObject({ value: 2, confidence: 'high' });
    expect(enrichment.unit).toMatchObject({ value: 'ק"ג', confidence: 'high' });
    expect(enrichment.category?.value).toMatchObject({ name: 'פירות' });
  });

  it('"Milk x2" -> product חלב, quantity 2', () => {
    const c = candidate({ id: 'c1', rawText: 'Milk x2', name: 'Milk', quantity: 1 });
    const enrichment = analyzeCandidate(c, emptyContext);
    expect(enrichment.quantity).toMatchObject({ value: 2, confidence: 'high' });
    expect(enrichment.name).toMatchObject({ value: 'חלב', confidence: 'high' });
  });

  it('"חלב תנובה" -> product חלב, category מוצרי חלב', () => {
    const c = candidate({ id: 'c1', rawText: 'חלב תנובה', name: 'חלב תנובה', quantity: 1 });
    const enrichment = analyzeCandidate(c, context);
    expect(enrichment.name).toMatchObject({ value: 'חלב', confidence: 'high' });
    expect(enrichment.category?.value).toMatchObject({ id: 'cat-dairy', name: 'מוצרי חלב' });
  });

  it('\'תפ"א\' -> product תפוח אדמה, category ירקות', () => {
    const c = candidate({ id: 'c1', rawText: 'תפ"א', name: 'תפ"א', quantity: 1 });
    const enrichment = analyzeCandidate(c, context);
    expect(enrichment.name).toMatchObject({ value: 'תפוח אדמה', confidence: 'high' });
    expect(enrichment.category?.value).toMatchObject({ id: 'cat-veg', name: 'ירקות' });
  });
});

describe('analyzeCandidate - never re-suggests a field that is already correct', () => {
  it('does not emit a quantity/unit enrichment when RuleBasedNormalizer already resolved the same values', () => {
    const c = candidate({ id: 'c1', rawText: '500 גרם גבינה', name: 'גבינה', quantity: 500, unit: 'גרם' });
    const enrichment = analyzeCandidate(c, emptyContext);
    expect(enrichment.quantity).toBeUndefined();
    expect(enrichment.unit).toBeUndefined();
  });

  it('does not emit a category enrichment when the candidate already has one', () => {
    const c = candidate({ id: 'c1', rawText: 'חלב', name: 'חלב', categoryId: 'cat-dairy', categoryName: 'מוצרי חלב' });
    const enrichment = analyzeCandidate(c, context);
    expect(enrichment.category).toBeUndefined();
  });
});

describe('analyzeCandidate - low-confidence unit fallback', () => {
  it('suggests the knowledge base default unit only at low confidence, when nothing was parsed from the text', () => {
    const c = candidate({ id: 'c1', rawText: 'אקטימל', name: 'אקטימל', unit: null });
    const enrichment = analyzeCandidate(c, emptyContext);
    expect(enrichment.unit).toMatchObject({ value: "יח'", confidence: 'low' });
  });
});

describe('analyzeCandidates - batch filtering', () => {
  it('omits candidates with nothing meaningful to add', () => {
    const c1 = candidate({ id: 'c1', rawText: 'קסדת אופניים', name: 'קסדת אופניים' });
    const results = analyzeCandidates([c1], emptyContext);
    expect(results).toHaveLength(0);
  });
});
