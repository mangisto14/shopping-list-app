// supabase/functions/import-ai-assistant/providers/AiProvider.ts
// The server-side (Deno) provider-agnostic interface - mirrors the
// discipline this app already established client-side for Normalizer/
// Validator/TextUnderstandingEngine: nothing outside a concrete
// provider file may reference a vendor name. `index.ts` only ever
// imports this interface, not any concrete provider - swapping Claude
// for OpenAI/Gemini later means adding one new file here and changing
// which one `index.ts` registers, never touching `index.ts`'s request
// handling, `schema.ts`'s validation, or anything client-side.
import type { AiAssistantRequest, RawProviderSuggestion } from '../schema.ts';

export interface AiProviderResult {
  suggestions: RawProviderSuggestion[];
}

export interface AiProvider {
  id: string;
  complete(request: AiAssistantRequest): Promise<AiProviderResult>;
}
