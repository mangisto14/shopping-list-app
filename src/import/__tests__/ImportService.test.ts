import { describe, expect, it, vi } from 'vitest';
import { importService } from '../ImportService';
import type { ImportPipelineContext } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [{ id: 'cat-1', name: 'Dairy' }],
  existingItemNames: [],
};

describe('importService.listSources', () => {
  it('lists all 8 registered sources, only paste-text available', async () => {
    const sources = await importService.listSources();
    expect(sources).toHaveLength(8);
    expect(sources.find((s) => s.meta.id === 'paste-text')?.available).toBe(true);
    expect(sources.filter((s) => s.available)).toHaveLength(1);
  });
});

describe('importService.runImport', () => {
  it('runs the full paste-text -> plain-text -> rule-based -> default pipeline', async () => {
    const result = await importService.runImport('paste-text', context, {
      kind: 'text',
      text: '2x milk\nbread',
    });

    expect(result.sourceId).toBe('paste-text');
    expect(result.extractorId).toBe('plain-text');
    expect(result.normalizerId).toBe('rule-based');
    // Phase 2B's Semantic Analysis stage recognizes "milk"/"bread" as
    // known product aliases and canonicalizes them to their Hebrew
    // names (see src/import/knowledge/products.ts) - a real,
    // deterministic improvement over RuleBasedNormalizer's output,
    // applied via the same enrichment pipeline as AI Analysis.
    expect(result.candidates.map((c) => c.name)).toEqual(['חלב', 'לחם']);
    expect(result.candidates[0]).toMatchObject({ quantity: 2, included: true });
  });

  it('rejects an unavailable source rather than silently doing nothing', async () => {
    await expect(importService.runImport('camera', context)).rejects.toThrow(/not available/i);
  });

  it('rejects an unknown source id', async () => {
    // @ts-expect-error - deliberately passing an invalid id to assert the runtime guard
    await expect(importService.runImport('not-a-real-source', context)).rejects.toThrow();
  });

  describe('package-size measurements never become a huge shopping quantity', () => {
    it.each([
      ['קורנפלקס 500 גרם', 'קורנפלקס', '500 גרם'],
      ['חלב 2 ליטר', 'חלב', '2 ליטר'],
      ['שמן 750 מ״ל', 'שמן', '750 מ"ל'],
      ['גבינה צהובה 400 גרם', 'גבינה צהובה', '400 גרם'],
      ['500 מ״ל חלב', 'חלב', '500 מ"ל'],
    ])('%s -> name %s, quantity 1, package info %s', async (text, expectedName, expectedUnit) => {
      const result = await importService.runImport('paste-text', context, { kind: 'text', text });
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]).toMatchObject({ name: expectedName, quantity: 1, unit: expectedUnit });
    });

    it.each([
      ['קורנפלקס 3', 'קורנפלקס', 3],
      ['מלפפון 5', 'מלפפון', 5],
      ['2 חלב', 'חלב', 2],
    ])('%s -> a genuine shopping count is untouched: name %s, quantity %i, no package info', async (text, expectedName, expectedQuantity) => {
      const result = await importService.runImport('paste-text', context, { kind: 'text', text });
      expect(result.candidates[0]).toMatchObject({ name: expectedName, quantity: expectedQuantity, unit: null });
    });

    it('"חלב 3%" -> the percentage stays part of the product identity, never read as a quantity', async () => {
      const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'חלב 3%' });
      expect(result.candidates[0]).toMatchObject({ name: 'חלב 3%', quantity: 1 });
    });

    it('does not cause repeated merging that produces a huge shopping quantity - commit() inserts exactly ONE row, not 500', async () => {
      const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קורנפלקס 500 גרם' });
      const addItem = vi.fn().mockResolvedValue(true);

      const outcome = await importService.commit(result, addItem);

      expect(addItem).toHaveBeenCalledTimes(1);
      expect(addItem).toHaveBeenCalledWith('קורנפלקס', null, { unit: '500 גרם', notes: null });
      expect(outcome).toEqual({ committed: 1, failed: 0 });
    });
  });
});

describe('importService.commit', () => {
  it('calls addItem once per included row per quantity, skipping excluded rows', async () => {
    const addItem = vi.fn().mockResolvedValue(true);
    const result = await importService.commit(
      {
        sourceId: 'paste-text',
        extractorId: 'plain-text',
        normalizerId: 'rule-based',
        extractionWarnings: [],
        issues: [],
        candidates: [
          {
            id: '1',
            rawText: '2x milk',
            name: 'milk',
            quantity: 2,
            unit: 'L',
            categoryId: 'cat-1',
            categoryName: 'Dairy',
            notes: 'get low-fat',
            included: true,
          },
          {
            id: '2',
            rawText: 'bread',
            name: 'bread',
            quantity: 1,
            unit: null,
            categoryId: null,
            categoryName: null,
            notes: null,
            included: false,
          },
        ],
      },
      addItem
    );

    expect(addItem).toHaveBeenCalledTimes(2);
    expect(addItem).toHaveBeenCalledWith('milk', 'cat-1', { unit: 'L', notes: 'get low-fat' });
    expect(result).toEqual({ committed: 2, failed: 0 });
  });

  it('counts a failed addItem call without throwing', async () => {
    const addItem = vi.fn().mockResolvedValue(false);
    const result = await importService.commit(
      {
        sourceId: 'paste-text',
        extractorId: 'plain-text',
        normalizerId: 'rule-based',
        extractionWarnings: [],
        issues: [],
        candidates: [
          {
            id: '1',
            rawText: 'milk',
            name: 'milk',
            quantity: 1,
            unit: null,
            categoryId: null,
            categoryName: null,
            notes: null,
            included: true,
          },
        ],
      },
      addItem
    );
    expect(result).toEqual({ committed: 0, failed: 1 });
  });

  describe('merging with an existing active item (final import commit fix)', () => {
    function candidate(overrides: Partial<Parameters<typeof importService.commit>[0]['candidates'][number]>) {
      return {
        id: '1',
        rawText: 'קישוא 3',
        name: 'קישוא',
        quantity: 3,
        unit: null,
        categoryId: 'cat-guessed',
        categoryName: 'ניחוש',
        notes: null,
        included: true,
        ...overrides,
      };
    }

    it('"existing קישוא x2 + imported קישוא 3" -> 3 more rows inserted using the existing item\'s exact name/metadata, not the candidate\'s own', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [
        { name: 'קישוא', categoryId: 'cat-veg', unit: "יח'", notes: 'מהחווה', isDone: false },
      ];

      const result = await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ quantity: 3 })],
        },
        addItem,
        existingItems
      );

      // 3 new rows, one per unit of quantity - each using the EXISTING
      // item's name/category/unit/notes so they join its group, never
      // the candidate's own guessed category.
      expect(addItem).toHaveBeenCalledTimes(3);
      expect(addItem).toHaveBeenCalledWith('קישוא', 'cat-veg', { unit: "יח'", notes: 'מהחווה' });
      expect(result).toEqual({ committed: 3, failed: 0 });
    });

    it('matches case/whitespace-insensitively, but inserts using the existing item\'s exact stored name', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: '  Milk  ', categoryId: 'cat-dairy', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'milk', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('  Milk  ', 'cat-dairy', { unit: null, notes: null });
    });

    it('creates a new item normally when no active match exists', async () => {
      const addItem = vi.fn().mockResolvedValue(true);

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ quantity: 1 })],
        },
        addItem,
        [] // no existing items at all
      );

      expect(addItem).toHaveBeenCalledWith('קישוא', 'cat-guessed', { unit: null, notes: null });
    });

    it('ignores a completed (is_done) item as a merge target - inserts using the candidate\'s own metadata instead', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'קישוא', categoryId: 'cat-veg', unit: "יח'", notes: null, isDone: true }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('קישוא', 'cat-guessed', { unit: null, notes: null });
    });

    it('uses the quantity approved in Preview (the candidate passed in), not any original parsed value', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'קישוא', categoryId: 'cat-veg', unit: null, notes: null, isDone: false }];

      // Simulates the user editing quantity from the pipeline's
      // original 3 up to 5 in Preview before confirming - commit()
      // only ever sees the post-edit candidate, so this is exactly
      // what "the merge must use the values after the user's edits"
      // means in practice: there is no separate "original" value commit()
      // could reach for even if it wanted to.
      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ quantity: 5 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledTimes(5);
    });

    it('never creates a duplicate group: two candidates that both match the same existing item both merge into it', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'קישוא', categoryId: 'cat-veg', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [
            candidate({ id: '1', quantity: 2 }),
            candidate({ id: '2', rawText: 'קישוא', quantity: 1 }),
          ],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledTimes(3);
      for (const call of addItem.mock.calls) {
        expect(call).toEqual(['קישוא', 'cat-veg', { unit: null, notes: null }]);
      }
    });
  });

  describe('generic merge identity (mergeKey) - not just exact name equality', () => {
    function candidate(overrides: Partial<Parameters<typeof importService.commit>[0]['candidates'][number]>) {
      return {
        id: '1',
        rawText: 'raw',
        name: 'name',
        quantity: 1,
        unit: null,
        categoryId: null,
        categoryName: null,
        notes: null,
        included: true,
        ...overrides,
      };
    }

    it('milk: "חלב 3%" merges into an existing plain "חלב"', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'חלב', categoryId: 'cat-dairy', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב 3%', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      // The richer candidate name ("חלב 3%") is preserved for the new
      // row, not silently dropped in favor of the plainer existing one.
      expect(addItem).toHaveBeenCalledWith('חלב 3%', 'cat-dairy', { unit: null, notes: null });
    });

    it('milk: "חלב 500 מ״ל" (package size, not a leading/trailing-only pattern) also merges into "חלב"', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'חלב', categoryId: 'cat-dairy', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב 500 מ״ל', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('חלב 500 מ״ל', 'cat-dairy', { unit: null, notes: null });
    });

    it('milk: soy milk never merges into plain milk - a genuinely different product', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'חלב', categoryId: 'cat-dairy', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב סויה', categoryId: 'cat-guessed', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      // No merge target found -> the candidate's OWN metadata is used,
      // never the existing plain-milk item's.
      expect(addItem).toHaveBeenCalledWith('חלב סויה', 'cat-guessed', { unit: null, notes: null });
    });

    it('milk: almond milk and soy milk are also distinct from each other', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'חלב סויה', categoryId: 'cat-dairy', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב שקדים', categoryId: 'cat-guessed', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('חלב שקדים', 'cat-guessed', { unit: null, notes: null });
    });

    it('rice: "אורז יסמין 500 גרם" merges into an existing "אורז יסמין 1 ק"ג"', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [
        { name: 'אורז יסמין 1 ק"ג', categoryId: 'cat-grains', unit: null, notes: null, isDone: false },
      ];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'אורז יסמין 500 גרם', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      // Both names carry the same word count - the tie-break falls to
      // the (slightly) longer string, which happens to be the
      // candidate's here ("500 גרם" vs '1 ק"ג').
      expect(addItem).toHaveBeenCalledWith('אורז יסמין 500 גרם', 'cat-grains', { unit: null, notes: null });
    });

    it('rice: jasmine rice never merges into basmati rice', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'אורז בסמטי', categoryId: 'cat-grains', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'אורז יסמין 1 ק"ג', categoryId: 'cat-guessed', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('אורז יסמין 1 ק"ג', 'cat-guessed', { unit: null, notes: null });
    });

    it('flour: white flour and whole-wheat flour never merge', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'קמח לבן 1 ק"ג', categoryId: 'cat-baking', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'קמח מלא 1 ק"ג', categoryId: 'cat-guessed', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('קמח מלא 1 ק"ג', 'cat-guessed', { unit: null, notes: null });
    });

    it('beverages: "קולה 500 מ״ל" merges into an existing "קולה 1.5 ליטר"', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [
        { name: 'קולה 1.5 ליטר', categoryId: 'cat-drinks', unit: null, notes: null, isDone: false },
      ];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'קולה 500 מ״ל', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('קולה 1.5 ליטר', 'cat-drinks', { unit: null, notes: null });
    });

    it('beverages: Coke Zero never merges with regular Coke', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [
        { name: 'קולה 1.5 ליטר', categoryId: 'cat-drinks', unit: null, notes: null, isDone: false },
      ];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'קולה זירו 1.5 ליטר', categoryId: 'cat-guessed', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('קולה זירו 1.5 ליטר', 'cat-guessed', { unit: null, notes: null });
    });

    it('category disambiguates when more than one existing item shares a mergeKey', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [
        { name: 'חלב', categoryId: 'cat-dairy', unit: "יח'", notes: null, isDone: false },
        { name: 'חלב', categoryId: 'cat-snacks', unit: null, notes: 'טעות סופר', isDone: false },
      ];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב 3%', categoryId: 'cat-snacks', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('חלב 3%', 'cat-snacks', { unit: null, notes: 'טעות סופר' });
    });

    it('never loses a unit/notes value the import found just because the existing item has none', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'חלב', categoryId: 'cat-dairy', unit: null, notes: null, isDone: false }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב 3%', unit: 'ליטר', notes: 'דל שומן', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('חלב 3%', 'cat-dairy', { unit: 'ליטר', notes: 'דל שומן' });
    });

    it('a completed (is_done) item at the same mergeKey is never picked as the merge target', async () => {
      const addItem = vi.fn().mockResolvedValue(true);
      const existingItems = [{ name: 'חלב', categoryId: 'cat-dairy', unit: null, notes: null, isDone: true }];

      await importService.commit(
        {
          sourceId: 'paste-text',
          extractorId: 'plain-text',
          normalizerId: 'rule-based',
          extractionWarnings: [],
          issues: [],
          candidates: [candidate({ name: 'חלב 3%', categoryId: 'cat-guessed', quantity: 1 })],
        },
        addItem,
        existingItems
      );

      expect(addItem).toHaveBeenCalledWith('חלב 3%', 'cat-guessed', { unit: null, notes: null });
    });
  });
});
