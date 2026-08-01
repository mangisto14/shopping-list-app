// supabase/functions/import-ai-assistant/index.ts
// Entry point. Responsibilities (per the Phase 2C spec): authenticate
// the caller, validate the payload, call the configured AiProvider,
// validate what it returns, and respond with JSON only - never free
// text, and never a thrown/unhandled error.
//
// `handleRequest` below is the actual logic, written as a plain
// function over Web-standard `Request`/`Response` with the AiProvider
// injected - deliberately free of any `Deno.*` global, so it's
// directly unit-testable from the app's normal Vitest suite (see
// __tests__/index.test.ts) without needing a Deno runtime. Only the
// last few lines of this file (env var lookup + `Deno.serve`
// registration) are Deno-specific glue, which is why they're kept to
// the unavoidable minimum and left untested the same way this app
// already leaves e.g. ImportSheet.tsx's JSX wiring to e2e coverage
// rather than a unit test.
import { CORS_HEADERS, jsonResponse } from './cors.ts';
import { isValidAiAssistantRequest, sanitizeSuggestion, type AiAssistantResponse } from './schema.ts';
import type { AiProvider } from './providers/AiProvider.ts';

export async function handleRequest(req: Request, deps: { provider: AiProvider }): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Authenticate: Supabase's platform-level JWT verification already
  // gates this function before it's ever invoked (functions are
  // deployed WITHOUT --no-verify-jwt - see supabase/config.toml) - this
  // is a second, explicit check so a missing Authorization header is
  // never silently treated as "no user", and so the behavior doesn't
  // silently depend on that platform default staying in place.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!isValidAiAssistantRequest(body)) {
    return jsonResponse({ error: 'Invalid request payload' }, 400);
  }

  try {
    const result = await deps.provider.complete(body);
    const suggestions = result.suggestions
      .map((raw) => sanitizeSuggestion(raw, body))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const response: AiAssistantResponse = {
      providerId: deps.provider.id,
      suggestions,
      warnings: [],
    };
    return jsonResponse(response, 200);
  } catch (err) {
    // Never blocks the import: the client's contract is "any non-2xx
    // or error body means continue with what the pipeline already has"
    // (see src/import/ai-assistant/SupabaseEdgeFunctionAiProvider.ts) -
    // so a Claude timeout, an invalid/missing tool call, or any other
    // provider failure all land here as one honest error response
    // rather than a crash.
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('import-ai-assistant: provider failed', message);
    return jsonResponse({ error: message }, 502);
  }
}

// Deno-specific wiring only below this line. `declare const Deno` is a
// type-only ambient declaration - it does not create a runtime binding,
// so `typeof Deno !== 'undefined'` below is safe to evaluate even in a
// Node/Vitest environment where no such global actually exists
// (`typeof` never throws on an undeclared identifier).
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};

if (typeof Deno !== 'undefined') {
  const { createClaudeProvider } = await import('./providers/ClaudeProvider.ts');
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const model = Deno.env.get('ANTHROPIC_MODEL') || undefined;
  // Built once at startup, not per-request - apiKey/model never change
  // for the lifetime of this function instance.
  const provider = apiKey ? createClaudeProvider(apiKey, model) : null;

  Deno.serve((req) => {
    if (!provider) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);
    }
    return handleRequest(req, { provider });
  });
}
