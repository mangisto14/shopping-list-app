// Separate file from ImportService.test.ts so this one file can
// vi.mock() the AI engine registry (the real heuristic engine never
// throws under normal input, so the "AI unavailable/fails" fail-safe
// path needs a stand-in that does).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportPipelineContext } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [{ id: 'cat-dairy', name: 'מוצרי חלב' }],
  existingItemNames: [],
};

describe('importService.runImport - AI Analysis stage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('enriches candidates and reports the engine id on success', async () => {
    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, {
      kind: 'text',
      text: '  - חלב 3%  ,',
    });

    expect(result.aiEngineId).toBe('heuristic');
    expect(result.candidates[0].name).toBe('חלב 3%');
    expect(result.candidates[0].aiSuggestions?.name).toMatchObject({ confidence: 'high' });
  });

  it('falls back to the untouched Validator output when the AI engine throws, never blocking the pipeline', async () => {
    vi.doMock('../ai/registerAiEngines', () => ({
      ALL_AI_ENGINES: [
        {
          id: 'broken',
          isAvailable: () => true,
          analyze: () => {
            throw new Error('simulated AI failure');
          },
        },
      ],
      DEFAULT_AI_ENGINE_ID: 'broken',
    }));

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'לחם' });

    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name).toBe('לחם');
    expect(result.candidates[0].aiSuggestions).toBeUndefined();
  });

  it('falls back cleanly when no AI engine is available at all', async () => {
    vi.doMock('../ai/registerAiEngines', () => ({
      ALL_AI_ENGINES: [{ id: 'unavailable', isAvailable: () => false, analyze: vi.fn() }],
      DEFAULT_AI_ENGINE_ID: 'unavailable',
    }));

    const { importService } = await import('../ImportService');
    const result = await importService.runImport('paste-text', context, { kind: 'text', text: 'ביצים' });

    expect(result.aiEngineId).toBeUndefined();
    expect(result.candidates[0].name).toBe('ביצים');
  });
});
