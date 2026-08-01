// supabase/functions/import-ai-assistant/providers/ClaudeProvider.ts
// The first (and, as of this phase, only) AiProvider implementation.
// Uses tool-forcing (`tool_choice: { type: 'tool', ... }`) rather than
// asking for JSON in a text reply and hoping - this is what actually
// makes "never return free text, always structured JSON" a guarantee
// from the API itself, not just a prompt instruction. `index.ts` still
// re-validates every field via schema.ts's sanitizeSuggestion() before
// it's allowed into the response - a forced tool call guarantees valid
// JSON shape, not that the model's opinions about categories/
// candidateIds are trustworthy.
import { buildSystemPrompt, buildUserMessage, IMPORT_ANALYSIS_SCHEMA, IMPORT_ANALYSIS_TOOL_NAME } from '../prompt.ts';
import type { AiAssistantRequest, RawProviderSuggestion } from '../schema.ts';
import type { AiProvider, AiProviderResult } from './AiProvider.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_TOKENS = 4096;
// At most one retry, and only for failures that are plausibly
// transient (a network blip, an AbortSignal.timeout firing, a 429, or
// a 5xx) - never for a 4xx client error, which would just fail the
// exact same way again. ImportService's own fail-safe handling already
// covers "AI genuinely unavailable"; this only exists to stop a single
// transient hiccup from throwing away an otherwise-successful AI
// Assistant pass.
const RETRY_DELAY_MS = 500;

interface AnthropicContentBlock {
  type: string;
  [key: string]: unknown;
}

interface AnthropicToolUseBlock extends AnthropicContentBlock {
  type: 'tool_use';
  name: string;
  input: { suggestions?: RawProviderSuggestion[] };
}

function isToolUseBlock(block: AnthropicContentBlock): block is AnthropicToolUseBlock {
  return block.type === 'tool_use' && block.name === IMPORT_ANALYSIS_TOOL_NAME;
}

// Thrown only for failures worth retrying once - see RETRY_DELAY_MS's
// doc comment above for exactly which ones.
class RetryableClaudeError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptOnce(apiKey: string, model: string, request: AiAssistantRequest): Promise<AiProviderResult> {
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(request.language, request.categories),
        messages: [{ role: 'user', content: buildUserMessage(request) }],
        tools: [
          {
            name: IMPORT_ANALYSIS_TOOL_NAME,
            description: 'Submit structured suggestions for the given shopping list items.',
            input_schema: IMPORT_ANALYSIS_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: IMPORT_ANALYSIS_TOOL_NAME },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // fetch() itself rejecting - connection reset, DNS failure, or the
    // timeout above firing - is always worth one retry.
    throw new RetryableClaudeError(err instanceof Error ? err.message : 'Network error calling Claude API');
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    const message = `Claude API returned ${response.status}: ${bodyText.slice(0, 500)}`;
    if (response.status === 429 || response.status >= 500) throw new RetryableClaudeError(message);
    throw new Error(message);
  }

  const data = await response.json();
  const content: AnthropicContentBlock[] = Array.isArray(data.content) ? data.content : [];
  const toolUse = content.find(isToolUseBlock);

  if (!toolUse) {
    throw new Error('Claude response did not include the expected tool call');
  }

  const suggestions = Array.isArray(toolUse.input?.suggestions) ? toolUse.input.suggestions : [];
  return { suggestions };
}

export function createClaudeProvider(apiKey: string, model = DEFAULT_MODEL): AiProvider {
  return {
    id: 'claude',
    async complete(request: AiAssistantRequest): Promise<AiProviderResult> {
      try {
        return await attemptOnce(apiKey, model, request);
      } catch (err) {
        if (!(err instanceof RetryableClaudeError)) throw err;
        await delay(RETRY_DELAY_MS);
        // Exactly one retry - whatever this second attempt throws
        // (retryable or not) propagates as-is to the caller.
        return attemptOnce(apiKey, model, request);
      }
    },
  };
}
