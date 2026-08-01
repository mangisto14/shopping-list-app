// src/import/ai-assistant/SupabaseEdgeFunctionAiProvider.ts
// The only concrete AiAssistantProvider today. Calls the
// import-ai-assistant Supabase Edge Function - never Claude, never any
// AI vendor, directly. `supabase.functions.invoke` automatically
// attaches the current session's access token as the Authorization
// header, which is what the Edge Function's own auth check relies on -
// no extra plumbing needed here for that.
//
// Architecture (per the Phase 2C spec):
//   React App -> ImportService -> Supabase Edge Function -> Claude API
//                                        -> Structured JSON -> Preview
// The client never calls Claude directly, and the Anthropic API key
// never exists anywhere in this bundle - only a Supabase project
// URL/anon key, same as every other request this app already makes.
import { supabase } from '../../supabase/client';
import type { ImportPipelineContext } from '../types';
import type { AiAssistantProvider, AiAssistantResult, UnresolvedItemForAi } from './types';

const EDGE_FUNCTION_NAME = 'import-ai-assistant';

export const supabaseEdgeFunctionAiProvider: AiAssistantProvider = {
  id: 'supabase-edge-function',

  // Network reachability isn't knowable synchronously without a call
  // of its own, so this always reports available - failures at
  // request time are handled per-call by ImportService's fail-safe
  // try/catch (see runImport), never surfaced as "unavailable" ahead
  // of time.
  isAvailable: () => true,

  async enrich(items: UnresolvedItemForAi[], context: ImportPipelineContext): Promise<AiAssistantResult> {
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
      body: {
        language: context.language ?? 'he',
        categories: context.existingCategories.map((c) => c.name),
        items,
      },
    });

    if (error) throw error;
    if (!data || typeof data !== 'object' || !Array.isArray((data as AiAssistantResult).suggestions)) {
      throw new Error('import-ai-assistant returned an unexpected response shape');
    }

    return data as AiAssistantResult;
  },
};
