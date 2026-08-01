import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClaudeProvider } from '../providers/ClaudeProvider.ts';
import type { AiAssistantRequest } from '../schema.ts';

const request: AiAssistantRequest = {
  language: 'he',
  categories: ['ירקות'],
  items: [
    { candidateId: 'c1', rawText: 'קישוא', currentName: 'קישוא', currentQuantity: 1, currentUnit: null, currentCategoryName: null },
  ],
};

function anthropicToolUseResponse(suggestions: unknown[]) {
  return {
    content: [{ type: 'tool_use', name: 'submit_import_analysis', input: { suggestions } }],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createClaudeProvider', () => {
  it('calls the Anthropic Messages API with tool-forcing and parses the tool_use block', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => anthropicToolUseResponse([{ candidateId: 'c1', category: 'ירקות', categoryConfidence: 'high' }]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = createClaudeProvider('fake-api-key');
    const result = await provider.complete(request);

    expect(result.suggestions).toEqual([{ candidateId: 'c1', category: 'ירקות', categoryConfidence: 'high' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('fake-api-key');
    const body = JSON.parse(init.body);
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'submit_import_analysis' });
    expect(body.tools[0].name).toBe('submit_import_analysis');
  });

  it('uses the given model override instead of the default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => anthropicToolUseResponse([]) });
    vi.stubGlobal('fetch', fetchMock);

    await createClaudeProvider('fake-api-key', 'claude-custom-model').complete(request);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('claude-custom-model');
  });

  it('throws with the status and body when the API returns a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createClaudeProvider('fake-api-key').complete(request)).rejects.toThrow(/500/);
  });

  it('throws a clear error when the response has no tool_use block', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'I cannot help with that.' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createClaudeProvider('fake-api-key').complete(request)).rejects.toThrow(/tool call/i);
  });

  it('propagates a network-level timeout as a rejected promise, never hanging or crashing the process', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createClaudeProvider('fake-api-key').complete(request)).rejects.toThrow(/timed out/i);
  });
});
