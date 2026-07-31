// src/import/ai/registerAiEngines.ts
// The single place that lists every registered TextUnderstandingEngine.
// Empty (or every engine's isAvailable() returning false) is a fully
// supported state - ImportService falls back to Validator's output
// untouched, per "the application must always remain functional
// without AI". A future vendor-backed engine (Claude, OpenAI, Gemini,
// Ollama, Azure OpenAI, ...) is added here as one more entry, never by
// editing heuristicTextUnderstandingEngine.ts or ImportService.
import type { TextUnderstandingEngine } from '../types';
import { heuristicTextUnderstandingEngine } from './HeuristicTextUnderstandingEngine';

export const ALL_AI_ENGINES: TextUnderstandingEngine[] = [heuristicTextUnderstandingEngine];
export const DEFAULT_AI_ENGINE_ID = heuristicTextUnderstandingEngine.id;
