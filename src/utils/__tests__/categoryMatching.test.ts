// src/utils/__tests__/categoryMatching.test.ts
import { describe, expect, test } from 'vitest';
import { findMatchingCategory, normalizeCategoryName } from '../categoryMatching';

interface TestCategory {
  id: string;
  name: string;
}

const CATEGORIES: TestCategory[] = [
  { id: 'c1', name: 'ירקות' },
  { id: 'c2', name: 'מוצרי חלב' },
];

describe('normalizeCategoryName', () => {
  test('trims surrounding whitespace', () => {
    expect(normalizeCategoryName('  ירקות  ')).toBe('ירקות');
  });

  test('lowercases latin-script names', () => {
    expect(normalizeCategoryName('Snacks')).toBe('snacks');
  });

  test('a whitespace-only name normalizes to an empty string', () => {
    expect(normalizeCategoryName('   ')).toBe('');
  });
});

describe('findMatchingCategory - existing category selection / lookup is unaffected by this feature', () => {
  test('finds an exact, already-correctly-cased match', () => {
    expect(findMatchingCategory(CATEGORIES, 'ירקות')).toEqual(CATEGORIES[0]);
  });

  test('a name with no match returns null - this is what "displays the create action" is gated on', () => {
    expect(findMatchingCategory(CATEGORIES, 'חטיפים')).toBeNull();
  });
});

describe('findMatchingCategory - duplicate detection (case/whitespace-insensitive)', () => {
  test('matches regardless of surrounding whitespace', () => {
    expect(findMatchingCategory(CATEGORIES, '  ירקות  ')).toEqual(CATEGORIES[0]);
  });

  test('matches regardless of case for latin-script names', () => {
    const categories: TestCategory[] = [{ id: 'c3', name: 'Snacks' }];
    expect(findMatchingCategory(categories, 'SNACKS')).toEqual(categories[0]);
    expect(findMatchingCategory(categories, 'snacks')).toEqual(categories[0]);
  });

  test('a genuinely different category name is never mistaken for a match', () => {
    expect(findMatchingCategory(CATEGORIES, 'פירות')).toBeNull();
  });
});

describe('findMatchingCategory - empty name can never "match" or be created', () => {
  test('an empty string returns null even when the category list is non-empty', () => {
    expect(findMatchingCategory(CATEGORIES, '')).toBeNull();
  });

  test('a whitespace-only string returns null', () => {
    expect(findMatchingCategory(CATEGORIES, '   ')).toBeNull();
  });

  test('an empty category list never matches anything', () => {
    expect(findMatchingCategory([], 'ירקות')).toBeNull();
  });
});
