import { describe, expect, it } from 'vitest';
import { formatQuantityAndUnit } from '../ImportPreviewRow';
import type { ImportItemCandidate } from '../../types';

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: 'item',
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

describe('formatQuantityAndUnit', () => {
  it('a package-size unit at quantity 1 displays alone - no redundant leading "1"', () => {
    // The exact "500 גרם" case that originally read as "1 500 גרם" -
    // easily misread as quantity 1500 rather than "quantity 1,
    // package 500 גרם" (see SemanticAnalyzer.ts's package-size
    // handling, which always resolves quantity to 1 for these).
    expect(formatQuantityAndUnit(candidate({ quantity: 1, unit: '500 גרם' }))).toBe('500 גרם');
    expect(formatQuantityAndUnit(candidate({ quantity: 1, unit: '2 ליטר' }))).toBe('2 ליטר');
  });

  it('a plain countable unit at quantity 1 also displays alone', () => {
    expect(formatQuantityAndUnit(candidate({ quantity: 1, unit: "יח'" }))).toBe("יח'");
  });

  it('quantity 1 with no unit at all still shows the "1" - nothing to disambiguate', () => {
    expect(formatQuantityAndUnit(candidate({ quantity: 1, unit: null }))).toBe('1');
  });

  it('a genuine multi-count is untouched - both the number and the unit show', () => {
    expect(formatQuantityAndUnit(candidate({ quantity: 3, unit: "יח'" }))).toBe("3 יח'");
    expect(formatQuantityAndUnit(candidate({ quantity: 5, unit: null }))).toBe('5');
  });
});
