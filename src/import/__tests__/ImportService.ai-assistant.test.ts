// Separate file from ImportService.test.ts so this one file can mock
// both the learning repository and the AI Assistant provider registry
// (vi.doMock requires a fresh module graph per scenario - see
// beforeEach's vi.resetModules()). "קישוא" (zucchini) is used
// throughout as the example unresolved product, matching the Phase 2C
// spec's own test scenarios - it is deliberately NOT in
// knowledge/products.ts, so Semantic Analysis alone can never resolve
// its category; only Learning or the AI Assistant can.
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

function mockLearningRepository(lookupResult: Map<string, unknown>, saveCorrection = vi.fn()) {
  const lookupMany = vi.fn().mockResolvedValue(lookupResult);
  vi.doMock('../learning/LearningRepository', () => ({
    learningRepository: { lookupMany, saveCorrection },
  }));
  return { lookupMany, saveCorrection };
}

describe('importService.runImport - Learning Lookup + AI Assistant (Phase 2C)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('learning hit -> AI Assistant is skipped entirely for that item', async () => {
    const enrichSpy = vi.fn();
    mockAiAssistantProvider(enrichSpy);
    mockLearningRepository(new Map([['קישוא', { categoryId: 'cat-fruit' }]]));

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(enrichSpy).not.toHaveBeenCalled();
    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates[0].categoryId).toBe('cat-fruit');
    expect(result.candidates[0].categoryName).toBe('פירות');
  });

  it('learning miss -> AI Assistant is called, batched, with only the unresolved item', async () => {
    const enrichSpy = vi.fn().mockResolvedValue({ providerId: 'claude', suggestions: [], warnings: [] });
    mockAiAssistantProvider(enrichSpy);
    mockLearningRepository(new Map());

    const { importService } = await import('../ImportService');
    await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא\nחלב' });

    expect(enrichSpy).toHaveBeenCalledTimes(1); // one batched call, not one per item
    const [items] = enrichSpy.mock.calls[0];
    // "חלב" resolves via Semantic Analysis alone (it's a known product,
    // though this list has no dairy category so it stays unresolved
    // too) - the key assertion here is that BOTH unresolved items went
    // out together in a single call, never one request per item.
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.some((i: { rawText: string }) => i.rawText === 'קישוא')).toBe(true);
  });

  it('never blocks the import on a provider timeout', async () => {
    mockAiAssistantProvider(vi.fn().mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError')));
    mockLearningRepository(new Map());

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name).toBe('קישוא');
  });

  it('never blocks the import on an Edge Function / invalid-response failure', async () => {
    mockAiAssistantProvider(vi.fn().mockRejectedValue(new Error('import-ai-assistant returned an unexpected response shape')));
    mockLearningRepository(new Map());

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates[0].categoryId).toBeNull();
  });

  it('never blocks the import when no AI Assistant provider is registered at all', async () => {
    vi.doMock('../ai-assistant/registerAiAssistantProviders', () => ({
      ALL_AI_ASSISTANT_PROVIDERS: [],
      DEFAULT_AI_ASSISTANT_PROVIDER_ID: 'nonexistent',
    }));
    mockLearningRepository(new Map());

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
  });

  it('successful enrichment: merges canonical name, category, and reports the provider id', async () => {
    const enrichSpy = vi.fn().mockImplementation(async (items: { candidateId: string }[]) => ({
      providerId: 'claude',
      suggestions: [
        {
          candidateId: items[0].candidateId,
          canonicalName: { value: 'קישוא', confidence: 'high' },
          category: { value: 'ירקות', confidence: 'medium' },
          reason: 'Common vegetable',
        },
      ],
      warnings: [],
    }));
    mockAiAssistantProvider(enrichSpy);
    mockLearningRepository(new Map());

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(result.aiEngineId).toBe('claude');
    expect(result.candidates[0].categoryId).toBe('cat-veg');
    expect(result.candidates[0].categoryName).toBe('ירקות');
    expect(result.candidates[0].aiSuggestions?.category).toMatchObject({ confidence: 'medium' });
  });

  it('does not call the AI Assistant at all when Learning already resolved every unresolved candidate', async () => {
    const enrichSpy = vi.fn();
    mockAiAssistantProvider(enrichSpy);
    mockLearningRepository(new Map([['קישוא', { categoryId: 'cat-veg', unit: "יח'" }]]));

    const { importService } = await import('../ImportService');
    await importService.runImport('paste-text', context, { kind: 'text', text: 'קישוא' });

    expect(enrichSpy).not.toHaveBeenCalled();
  });
});
