import { describe, expect, it } from 'vitest';
import { isAmbiguousName, levenshteinDistance, normalizeForComparison, tokenize } from '../textUtils';

describe('normalizeForComparison', () => {
  it('trims, lowercases, and collapses whitespace', () => {
    expect(normalizeForComparison('  Milk   2%  ')).toBe('milk 2%');
  });
});

describe('tokenize', () => {
  it('splits on whitespace and common separators', () => {
    expect(tokenize('חלב 3%, טרי')).toEqual(['חלב', '3%', 'טרי']);
  });
});

describe('levenshteinDistance', () => {
  it('is 0 for identical strings', () => {
    expect(levenshteinDistance('milk', 'milk')).toBe(0);
  });

  it('counts single-character edits', () => {
    expect(levenshteinDistance('milk', 'milks')).toBe(1);
    expect(levenshteinDistance('עגבניה', 'עגבניות')).toBeLessThanOrEqual(2);
  });
});

describe('isAmbiguousName', () => {
  it('flags empty/whitespace-only and single-character names', () => {
    expect(isAmbiguousName('')).toBe(true);
    expect(isAmbiguousName('  ')).toBe(true);
    expect(isAmbiguousName('x')).toBe(true);
  });

  it('flags names with no Latin/Hebrew letters at all', () => {
    expect(isAmbiguousName('123')).toBe(true);
    expect(isAmbiguousName('!!')).toBe(true);
  });

  it('does not flag a real Hebrew or English product name', () => {
    expect(isAmbiguousName('חלב')).toBe(false);
    expect(isAmbiguousName('milk')).toBe(false);
    expect(isAmbiguousName('2x milk')).toBe(false);
  });
});
