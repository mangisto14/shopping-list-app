// Separate file from ImportService.test.ts so this one can mock
// LearningRepository (see ImportService.ai-assistant.test.ts for the
// same vi.doMock + vi.resetModules() pattern, used here for the same
// reason: a fresh module graph per scenario).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportItemCandidate, ImportPipelineContext } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [{ id: 'cat-fruit', name: 'פירות' }],
  existingItemNames: [],
  userId: 'user-1',
  language: 'he',
};

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: 'קישוא',
    name: 'קישוא',
    quantity: 1,
    unit: null,
    categoryId: null,
    categoryName: null,
    notes: null,
    included: true,
    ...overrides,
  };
}

function mockLearningRepository() {
  const saveCorrections = vi.fn().mockResolvedValue(undefined);
  vi.doMock('../learning/LearningRepository', () => ({
    learningRepository: { lookupMany: vi.fn(), saveCorrections },
  }));
  return saveCorrections;
}

describe('importService.saveLearning', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('stores only the fields that actually changed', async () => {
    const saveCorrections = mockLearningRepository();
    const { importService } = await import('../ImportService');

    const original = [candidate({ id: 'c1', categoryId: null, unit: null, quantity: 1 })];
    const edited = [candidate({ id: 'c1', categoryId: 'cat-fruit', categoryName: 'פירות', unit: null, quantity: 1 })];

    await importService.saveLearning(original, edited, context);

    expect(saveCorrections).toHaveBeenCalledWith('user-1', [
      { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' } },
    ]);
  });

  it('saves nothing when the user accepted every field as the pipeline produced it', async () => {
    const saveCorrections = mockLearningRepository();
    const { importService } = await import('../ImportService');

    const original = [candidate({ id: 'c1', categoryId: 'cat-fruit', categoryName: 'פירות' })];
    const edited = [candidate({ id: 'c1', categoryId: 'cat-fruit', categoryName: 'פירות' })];

    await importService.saveLearning(original, edited, context);

    expect(saveCorrections).not.toHaveBeenCalled();
  });

  it('batches multiple corrected rows from one import into a single saveCorrections call', async () => {
    const saveCorrections = mockLearningRepository();
    const { importService } = await import('../ImportService');

    const original = [
      candidate({ id: 'c1', rawText: 'קישוא', categoryId: null }),
      candidate({ id: 'c2', rawText: 'חלב', unit: null }),
    ];
    const edited = [
      candidate({ id: 'c1', rawText: 'קישוא', categoryId: 'cat-fruit', categoryName: 'פירות' }),
      candidate({ id: 'c2', rawText: 'חלב', unit: 'ליטר' }),
    ];

    await importService.saveLearning(original, edited, context);

    expect(saveCorrections).toHaveBeenCalledTimes(1);
    expect(saveCorrections).toHaveBeenCalledWith('user-1', [
      { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' } },
      { originalText: 'חלב', correction: { unit: 'ליטר' } },
    ]);
  });

  it('learns a quantity change', async () => {
    const saveCorrections = mockLearningRepository();
    const { importService } = await import('../ImportService');

    const original = [candidate({ id: 'c1', quantity: 1 })];
    const edited = [candidate({ id: 'c1', quantity: 3 })];

    await importService.saveLearning(original, edited, context);

    expect(saveCorrections).toHaveBeenCalledWith('user-1', [{ originalText: 'קישוא', correction: { quantity: 3 } }]);
  });

  it('learns an explicit "no category" correction, but not clearing a unit', async () => {
    const saveCorrections = mockLearningRepository();
    const { importService } = await import('../ImportService');

    const original = [candidate({ id: 'c1', categoryId: 'cat-fruit', categoryName: 'פירות', unit: 'ליטר' })];
    const edited = [candidate({ id: 'c1', categoryId: null, categoryName: null, unit: null })];

    await importService.saveLearning(original, edited, context);

    expect(saveCorrections).toHaveBeenCalledWith('user-1', [{ originalText: 'קישוא', correction: { categoryId: null } }]);
  });

  it('does nothing without a userId in context', async () => {
    const saveCorrections = mockLearningRepository();
    const { importService } = await import('../ImportService');

    const original = [candidate({ id: 'c1', categoryId: null })];
    const edited = [candidate({ id: 'c1', categoryId: 'cat-fruit' })];

    await importService.saveLearning(original, edited, { ...context, userId: undefined });

    expect(saveCorrections).not.toHaveBeenCalled();
  });
});
