import { describe, expect, it } from 'vitest';
import { matchProduct } from '../KnowledgeMatcher';
import { knowledgeBase } from '../KnowledgeBase';
import type { ImportPipelineContext } from '../../types';

const context: ImportPipelineContext = {
  existingCategories: [
    { id: 'cat-dairy', name: 'מוצרי חלב' },
    { id: 'cat-veg', name: 'ירקות' },
  ],
  existingItemNames: [],
};

const emptyContext: ImportPipelineContext = { existingCategories: [], existingItemNames: [] };

describe('KnowledgeBase', () => {
  it('is loaded once - repeated getAllProducts() calls return the same array instance', () => {
    expect(knowledgeBase.getAllProducts()).toBe(knowledgeBase.getAllProducts());
  });

  it('looks up a product by its canonical name, an alias, and a generated brand combo', () => {
    expect(knowledgeBase.lookupExactOrAlias('חלב')?.id).toBe('milk');
    expect(knowledgeBase.lookupExactOrAlias('milk')?.id).toBe('milk');
    expect(knowledgeBase.lookupExactOrAlias('חלב תנובה')?.id).toBe('milk');
    expect(knowledgeBase.lookupExactOrAlias('חלב טרה')?.id).toBe('milk');
  });
});

describe('matchProduct - canonicalization', () => {
  it('recognizes an exact canonical name with no rename needed', () => {
    const result = matchProduct('מלפפון', emptyContext);
    expect(result.matchTier).toBe('exact-product');
    expect(result.canonicalName).toBe('מלפפון');
    expect(result.nameConfidence).toBeNull();
  });

  it('canonicalizes a brand-qualified name: "חלב תנובה" -> חלב, category מוצרי חלב', () => {
    const result = matchProduct('חלב תנובה', emptyContext);
    expect(result.matchTier).toBe('alias');
    expect(result.canonicalName).toBe('חלב');
    expect(result.categoryName).toBe('מוצרי חלב');
  });

  it('canonicalizes "קולה זירו" -> קוקה קולה זירו', () => {
    const result = matchProduct('קולה זירו', emptyContext);
    expect(result.canonicalName).toBe('קוקה קולה זירו');
  });

  it('leaves a product already at its own canonical spelling alone: אקטימל -> אקטימל', () => {
    const result = matchProduct('אקטימל', emptyContext);
    expect(result.matchTier).toBe('exact-product');
    expect(result.canonicalName).toBe('אקטימל');
    expect(result.categoryName).toBe('מוצרי חלב');
  });
});

describe('matchProduct - aliases', () => {
  it('resolves the required abbreviation aliases', () => {
    expect(matchProduct('תפ"א', emptyContext)).toMatchObject({ canonicalName: 'תפוח אדמה', matchTier: 'alias' });
    expect(matchProduct("מלפ'", emptyContext)).toMatchObject({ canonicalName: 'מלפפון', matchTier: 'alias' });
    expect(matchProduct("עגב'", emptyContext)).toMatchObject({ canonicalName: 'עגבנייה', matchTier: 'alias' });
    expect(matchProduct('נס', emptyContext)).toMatchObject({ canonicalName: 'קפה נמס', matchTier: 'alias' });
  });

  it('resolves an English alias case-insensitively', () => {
    const result = matchProduct('Milk', emptyContext);
    expect(result.canonicalName).toBe('חלב');
    expect(result.matchTier).toBe('alias');
  });

  it('resolves a plural alias: תפוחים -> תפוח, category פירות', () => {
    const result = matchProduct('תפוחים', emptyContext);
    expect(result.canonicalName).toBe('תפוח');
    expect(result.categoryName).toBe('פירות');
  });
});

describe('matchProduct - keyword tier (never renames)', () => {
  it('matches a token inside a longer phrase without suggesting a rename', () => {
    const result = matchProduct('חלב 3%', emptyContext);
    expect(result.matchTier).toBe('keyword');
    expect(result.nameConfidence).toBeNull();
    expect(result.categoryName).toBe('מוצרי חלב');
  });

  it('matches a keyword stem across inflections: עגבניה / עגבניות both resolve without renaming', () => {
    expect(matchProduct('עגבניה', emptyContext)).toMatchObject({ matchTier: 'keyword', nameConfidence: null, categoryName: 'ירקות' });
    expect(matchProduct('עגבניות', emptyContext)).toMatchObject({ matchTier: 'keyword', nameConfidence: null, categoryName: 'ירקות' });
  });
});

describe('matchProduct - category resolution priority', () => {
  it('falls back to a textual match against the user\'s own existing categories when no product matches', () => {
    const result = matchProduct('ירקות אורגניים', context);
    expect(result.matchTier).toBe('existing-category');
    expect(result.categoryName).toBe('ירקות');
    expect(result.canonicalName).toBeNull();
  });

  it('never invents a category: an unrecognized name with no existing-category or fuzzy match resolves to none', () => {
    const result = matchProduct('קסדת אופניים', emptyContext);
    expect(result.matchTier).toBe('none');
    expect(result.categoryName).toBeNull();
    expect(result.categoryConfidence).toBeNull();
  });

  it('finds a fuzzy match for a near-miss spelling, at low confidence only', () => {
    const result = matchProduct('מלפפוו', emptyContext); // one-letter typo
    expect(result.matchTier).toBe('fuzzy');
    expect(result.canonicalName).toBe('מלפפון');
    expect(result.nameConfidence).toBe('low');
    expect(result.categoryConfidence).toBe('low');
  });
});

describe('matchProduct - confidence engine', () => {
  it('never returns a numeric confidence for category or name', () => {
    for (const input of ['חלב', 'חלב תנובה', 'חלב 3%', 'ירקות אורגניים', 'מלפפוו', 'קסדת אופניים']) {
      const result = matchProduct(input, context);
      if (result.nameConfidence !== null) expect(['high', 'medium', 'low']).toContain(result.nameConfidence);
      if (result.categoryConfidence !== null) expect(['high', 'medium', 'low']).toContain(result.categoryConfidence);
    }
  });

  it('never claims high confidence for a category suggestion, even on an exact product match', () => {
    const result = matchProduct('חלב', emptyContext);
    expect(result.categoryConfidence).toBe('medium');
  });
});
