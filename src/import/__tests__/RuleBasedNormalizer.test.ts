import { describe, expect, it } from 'vitest';
import { ruleBasedNormalizer } from '../normalizers/RuleBasedNormalizer';
import type { ImportPipelineContext } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [
    { id: 'cat-dairy', name: 'מוצרי חלב' },
    { id: 'cat-veg', name: 'ירקות' },
  ],
  existingItemNames: [],
};

describe('ruleBasedNormalizer', () => {
  it('does not call any network/AI - pure function over its inputs', async () => {
    // No mocking needed to assert this: the implementation has no
    // fetch/HTTP import at all. This test exists to make that
    // assumption explicit and catch a future regression.
    const source = ruleBasedNormalizer.normalize.toString();
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest/);
  });

  it('parses a plain line with no quantity/unit as quantity 1', async () => {
    const result = await ruleBasedNormalizer.normalize({ kind: 'lines', lines: ['לחם'], warnings: [] }, context);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'לחם', quantity: 1, unit: null, notes: null });
  });

  it('parses a "2x name" multiplier', async () => {
    const result = await ruleBasedNormalizer.normalize({ kind: 'lines', lines: ['2x לחם'], warnings: [] }, context);
    expect(result[0]).toMatchObject({ name: 'לחם', quantity: 2, unit: null });
  });

  it('parses a "quantity unit name" pattern', async () => {
    const result = await ruleBasedNormalizer.normalize(
      { kind: 'lines', lines: ['500 גרם עגבניות'], warnings: [] },
      context
    );
    expect(result[0]).toMatchObject({ name: 'עגבניות', quantity: 500, unit: 'גרם' });
  });

  it('splits trailing " - notes" into the notes field', async () => {
    const result = await ruleBasedNormalizer.normalize(
      { kind: 'lines', lines: ['חלב 3% - לוודא טרי'], warnings: [] },
      context
    );
    expect(result[0]).toMatchObject({ name: 'חלב 3%', notes: 'לוודא טרי' });
  });

  it('guesses a category when an existing category name appears in the line', async () => {
    const result = await ruleBasedNormalizer.normalize(
      { kind: 'lines', lines: ['ירקות טריים'], warnings: [] },
      context
    );
    expect(result[0].categoryGuess).toMatchObject({ id: 'cat-veg', name: 'ירקות' });
  });

  it('drops lines that parse to an empty name', async () => {
    const result = await ruleBasedNormalizer.normalize({ kind: 'lines', lines: ['   '], warnings: [] }, context);
    expect(result).toHaveLength(0);
  });

  it('parses tabular rows using a recognized header', async () => {
    const result = await ruleBasedNormalizer.normalize(
      {
        kind: 'rows',
        rows: [
          ['name', 'quantity', 'unit', 'category', 'notes'],
          ['חלב', '2', 'ליטר', 'מוצרי חלב', 'טרי'],
        ],
        warnings: [],
      },
      context
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'חלב',
      quantity: 2,
      unit: 'ליטר',
      notes: 'טרי',
      categoryGuess: { id: 'cat-dairy', name: 'מוצרי חלב' },
    });
  });
});
