// src/import/ai-assistant/types.ts
// The client-side half of the contract supabase/functions/import-ai-
// assistant/schema.ts defines server-side. Deliberately a separate,
// independent copy rather than a shared import across the client/Deno
// boundary - the two runtimes never share a module graph - but the
// SHAPE is kept identical on purpose so the client can trust the
// response without re-deriving its own interpretation of it.
//
// `AiAssistantProvider` is the ONLY thing `ImportService` ever imports
// from this module (see registerAiAssistantProviders.ts) - it has no
// idea a Supabase Edge Function or Claude is involved. The frontend
// must never know which AI provider is being used: this interface is
// what makes that literally true in code, not just in intent.
import type { ConfidenceLevel, ImportPipelineContext } from '../types';

export interface UnresolvedItemForAi {
  candidateId: string;
  rawText: string;
  currentName: string;
  currentQuantity: number;
  currentUnit: string | null;
  currentCategoryName: string | null;
}

export interface AiAssistantSuggestion {
  candidateId: string;
  canonicalName?: { value: string; confidence: ConfidenceLevel };
  category?: { value: string; confidence: ConfidenceLevel };
  quantity?: { value: number; confidence: ConfidenceLevel };
  unit?: { value: string; confidence: ConfidenceLevel };
  notes?: { value: string; confidence: ConfidenceLevel };
  reason?: string;
}

export interface AiAssistantResult {
  providerId: string;
  suggestions: AiAssistantSuggestion[];
  warnings: string[];
}

// Provider-agnostic BY CONSTRUCTION, same discipline as `Normalizer`/
// `Validator`: nothing here references Claude, OpenAI, Gemini, or any
// vendor. `SupabaseEdgeFunctionAiProvider` is the only implementation
// today - it calls a Supabase Edge Function, which is itself
// provider-agnostic on the server side (see
// supabase/functions/import-ai-assistant/providers/AiProvider.ts). A
// future implementation calling a *different* backend (a second edge
// function, an on-device model, ...) satisfies this exact same
// interface and is swapped in via registration - ImportService's
// orchestration never changes for it.
export interface AiAssistantProvider {
  id: string;
  isAvailable(): boolean | Promise<boolean>;
  enrich(items: UnresolvedItemForAi[], context: ImportPipelineContext): Promise<AiAssistantResult>;
}
