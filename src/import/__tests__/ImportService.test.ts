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
});
