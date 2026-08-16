// Category learning generalization: a past category correction applies
// to a LATER import of the same product identity (mergeKey - see
// semantic/mergeKey.ts), not just an exact repeat of the original
// text. "קישוא" (zucchini) is used throughout, matching this suite's
// existing convention (see ImportService.ai-assistant.test.ts's own
// comment) - it's deliberately NOT in knowledge/products.ts, so
// Semantic Analysis alone can never resolve its category.
//
// Separate file from ImportService.ai-assistant.test.ts so this one
// can mock both learningRepository methods (lookupMany AND the new
// lookupCategoriesByMergeKey) without touching that file's existing
// scenarios - same vi.doMock + vi.resetModules() pattern used
// throughout this module's tests.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportPipelineContext } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [
    { id: 'cat-veg', name: 'ירקות' },
    { id: 'cat-fruit', name: 'פירות' },
  ],
  existingItemNames: [],
  userId: 'user-1',
  language: 'he',
};

function mockAiAssistantProvider(enrich: ReturnType<typeof vi.fn>) {
  vi.doMock('../ai-assistant/registerAiAssistantProviders', () => ({
    ALL_AI_ASSISTANT_PROVIDERS: [{ id: 'test-provider', isAvailable: () => true, enrich }],
    DEFAULT_AI_ASSISTANT_PROVIDER_ID: 'test-provider',
  }));
}

function mockLearningRepository(options: {
  lookupManyResult?: Map<string, unknown>;
  categoryByMergeKey?: Map<string, string>;
} = {}) {
  const lookupMany = vi.fn().mockResolvedValue(options.lookupManyResult ?? new Map());
  const lookupCategoriesByMergeKey = vi.fn().mockResolvedValue(options.categoryByMergeKey ?? new Map());
  const saveCorrections = vi.fn().mockResolvedValue(undefined);
  vi.doMock('../learning/LearningRepository', () => ({
    learningRepository: { lookupMany, lookupCategoriesByMergeKey, saveCorrections },
  }));
  return { lookupMany, lookupCategoriesByMergeKey, saveCorrections };
}

describe('importService.runImport - category learning via mergeKey (generalizes across phrasings)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('a category learned for one phrasing is applied to a later, differently-phrased import of the same product, with no AI call', async () => {
    const enrichSpy = vi.fn();
    mockAiAssistantProvider(enrichSpy);
    // Exact-text lookup misses ("קישוא 3" != "קישוא"); the mergeKey
    // fallback (keyed by the parsed, size-stripped identity "קישוא")
    // is what resolves it.
    const { lookupCategoriesByMergeKey } = mockLearningRepository({
      categoryByMergeKey: new Map([['קישוא', 'cat-veg']]),
    });

    const { importService } = await import('../ImportService');
    // "קישוא 3" is a known, already-tested trailing-quantity shape
    // (see e2e/smart-import-merge.spec.ts) - parses to name "קישוא",
    // quantity 3, so its rawText never matches the exact-text-keyed
    // original correction, but its identity does.
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא 3' });

    expect(lookupCategoriesByMergeKey).toHaveBeenCalledWith('user-1', ['קישוא']);
    expect(enrichSpy).not.toHaveBeenCalled();
    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates[0].categoryId).toBe('cat-veg');
    expect(result.candidates[0].categoryName).toBe('ירקות');
    // Untouched by the category-only fallback.
    expect(result.candidates[0].quantity).toBe(3);
    expect(result.candidates[0].name).toBe('קישוא');
    // mergeKey stays correctly derived from the (unchanged) name - the
    // fallback never overrides it with an explicit value of its own.
    expect(result.candidates[0].mergeKey).toBe('קישוא');
  });

  it('a category learned from "X גדול" is applied to a later plain "X" - a generic size descriptor, not a numeric token, still collapses to one identity', async () => {
    const enrichSpy = vi.fn();
    mockAiAssistantProvider(enrichSpy);
    // "קורנפלקס גדול" and "קורנפלקס" share one mergeKey once "גדול" is
    // recognized as a generic size descriptor (see mergeKey.ts's
    // SIZE_DESCRIPTOR_WORDS) - this is the exact scenario originally
    // reported as broken.
    const { lookupCategoriesByMergeKey } = mockLearningRepository({
      categoryByMergeKey: new Map([['קורנפלקס', 'cat-veg']]),
    });

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קורנפלקס' });

    expect(lookupCategoriesByMergeKey).toHaveBeenCalledWith('user-1', ['קורנפלקס']);
    expect(enrichSpy).not.toHaveBeenCalled();
    expect(result.candidates[0].categoryId).toBe('cat-veg');
  });

  it('an exact-text learning hit always takes priority - the mergeKey fallback is never even queried', async () => {
    const enrichSpy = vi.fn();
    mockAiAssistantProvider(enrichSpy);
    const { lookupCategoriesByMergeKey } = mockLearningRepository({
      lookupManyResult: new Map([['קישוא', { categoryId: 'cat-veg' }]]),
      categoryByMergeKey: new Map([['קישוא', 'cat-fruit']]), // would disagree, but must never be consulted
    });

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(lookupCategoriesByMergeKey).not.toHaveBeenCalled();
    expect(enrichSpy).not.toHaveBeenCalled();
    expect(result.candidates[0].categoryId).toBe('cat-veg');
  });

  it('a stale learned category (deleted since) is not applied - the candidate safely falls back to the normal AI resolution path', async () => {
    const enrichSpy = vi.fn().mockResolvedValue({ providerId: 'claude', suggestions: [], warnings: [] });
    mockAiAssistantProvider(enrichSpy);
    mockLearningRepository({
      // 'cat-deleted' does not exist in context.existingCategories.
      categoryByMergeKey: new Map([['קישוא', 'cat-deleted']]),
    });

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    // Never crashes, never applies the dangling id - falls through to
    // the same AI Assistant path an ordinary learning miss would take.
    expect(enrichSpy).toHaveBeenCalledTimes(1);
    expect(result.candidates[0].categoryId).toBeNull();
  });

  it('an unrelated product (different mergeKey) never receives the learned category', async () => {
    const enrichSpy = vi.fn().mockResolvedValue({ providerId: 'claude', suggestions: [], warnings: [] });
    mockAiAssistantProvider(enrichSpy);
    mockLearningRepository({ categoryByMergeKey: new Map([['קישוא', 'cat-veg']]) });

    const { importService } = await import('../ImportService');
    // "חלב" (milk) has a completely different identity - this context
    // has no dairy category, so Semantic Analysis alone can't resolve
    // it either (same setup as ImportService.ai-assistant.test.ts's
    // own "learning miss" scenario).
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'חלב' });

    const milk = result.candidates.find((c) => c.name === 'חלב');
    expect(milk?.categoryId).not.toBe('cat-veg');
  });

  it('does not query the mergeKey fallback at all when every candidate already has a category', async () => {
    const enrichSpy = vi.fn();
    mockAiAssistantProvider(enrichSpy);
    const { lookupCategoriesByMergeKey } = mockLearningRepository({
      lookupManyResult: new Map([['קישוא', { categoryId: 'cat-veg' }]]),
    });

    const { importService } = await import('../ImportService');
    await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(lookupCategoriesByMergeKey).not.toHaveBeenCalled();
  });
});
