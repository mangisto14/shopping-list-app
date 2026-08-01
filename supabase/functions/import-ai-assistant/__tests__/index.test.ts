import { describe, expect, it } from 'vitest';
import { handleRequest } from '../index.ts';
import type { AiProvider } from '../providers/AiProvider.ts';

const validBody = {
  language: 'he',
  categories: ['ירקות', 'פירות'],
  items: [
    {
      candidateId: 'c1',
      rawText: 'קישוא',
      currentName: 'קישוא',
      currentQuantity: 1,
      currentUnit: null,
      currentCategoryName: null,
    },
  ],
};

function postRequest(body: unknown, headers: Record<string, string> = { Authorization: 'Bearer fake-jwt' }) {
  return new Request('https://example.supabase.co/functions/v1/import-ai-assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const workingProvider: AiProvider = {
  id: 'claude',
  async complete() {
    return {
      suggestions: [{ candidateId: 'c1', category: 'ירקות', categoryConfidence: 'high' }],
    };
  },
};

describe('handleRequest', () => {
  it('responds to a CORS preflight without requiring auth', async () => {
    const req = new Request('https://x.supabase.co/f', { method: 'OPTIONS' });
    const res = await handleRequest(req, { provider: workingProvider });
    expect(res.status).toBe(200);
  });

  it('rejects a non-POST method', async () => {
    const req = new Request('https://x.supabase.co/f', { method: 'GET' });
    const res = await handleRequest(req, { provider: workingProvider });
    expect(res.status).toBe(405);
  });

  it('rejects a request with no Authorization header', async () => {
    const req = postRequest(validBody, {});
    const res = await handleRequest(req, { provider: workingProvider });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/authorization/i);
  });

  it('rejects invalid JSON in the body', async () => {
    const req = new Request('https://x.supabase.co/f', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake-jwt', 'content-type': 'application/json' },
      body: '{not valid json',
    });
    const res = await handleRequest(req, { provider: workingProvider });
    expect(res.status).toBe(400);
  });

  it('rejects a structurally invalid payload', async () => {
    const req = postRequest({ language: 'he' }); // missing categories/items
    const res = await handleRequest(req, { provider: workingProvider });
    expect(res.status).toBe(400);
  });

  it('returns a sanitized, structured JSON response on success', async () => {
    const req = postRequest(validBody);
    const res = await handleRequest(req, { provider: workingProvider });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      providerId: 'claude',
      suggestions: [{ candidateId: 'c1', category: { value: 'ירקות', confidence: 'high' } }],
      warnings: [],
    });
  });

  it('never blocks on a provider timeout - returns a JSON error, not a thrown exception', async () => {
    const timeoutProvider: AiProvider = {
      id: 'claude',
      async complete() {
        throw new DOMException('The operation timed out.', 'TimeoutError');
      },
    };
    const req = postRequest(validBody);
    const res = await handleRequest(req, { provider: timeoutProvider });
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/timed out/i);
  });

  it('returns a JSON error (never free text) when the provider fails for any other reason', async () => {
    const failingProvider: AiProvider = {
      id: 'claude',
      async complete() {
        throw new Error('Claude API returned 500: internal error');
      },
    };
    const req = postRequest(validBody);
    const res = await handleRequest(req, { provider: failingProvider });
    expect(res.status).toBe(502);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    const json = await res.json();
    expect(json).toEqual({ error: 'Claude API returned 500: internal error' });
  });

  it('drops suggestions the provider fabricates for an unknown candidateId', async () => {
    const fabricatingProvider: AiProvider = {
      id: 'claude',
      async complete() {
        return { suggestions: [{ candidateId: 'not-real', category: 'ירקות', categoryConfidence: 'high' }] };
      },
    };
    const req = postRequest(validBody);
    const res = await handleRequest(req, { provider: fabricatingProvider });
    const json = await res.json();
    expect(json.suggestions).toEqual([]);
  });
});
