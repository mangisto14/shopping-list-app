// src/import/ai-assistant/registerAiAssistantProviders.ts
// The single place that lists every registered AiAssistantProvider -
// same registry + DEFAULT_ID pattern every other pluggable stage in
// this module already uses (sources, extractors, normalizers,
// validators). A future second provider (e.g. one backed by a
// different edge function or an on-device model) is added here as one
// more entry, never by editing ImportService or
// SupabaseEdgeFunctionAiProvider.ts.
import type { AiAssistantProvider } from './types';
import { supabaseEdgeFunctionAiProvider } from './SupabaseEdgeFunctionAiProvider';

export const ALL_AI_ASSISTANT_PROVIDERS: AiAssistantProvider[] = [supabaseEdgeFunctionAiProvider];
export const DEFAULT_AI_ASSISTANT_PROVIDER_ID = supabaseEdgeFunctionAiProvider.id;
