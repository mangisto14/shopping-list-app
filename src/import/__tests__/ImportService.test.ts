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
    expect(result.candidates.map((c) => c.name)).toEqual(['milk', 'bread']);
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
});
