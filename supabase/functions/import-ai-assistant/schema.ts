// supabase/functions/import-ai-assistant/schema.ts
// The request/response contract for this function - deliberately the
// ONLY place that knows the shape of what the client sends and what
// this function returns. Validation here is what makes "never return
// free text, only JSON" and "the AI must never invent unsupported
// fields" actually enforced, not just requested of the model - a
// model's tool-call output is trusted input from the client's
// perspective, but not from this function's, so every field is
// re-checked against what was actually sent in the request before
// it's allowed into the response.
export type ConfidenceLevel = 'high' | 'medium' | 'low';

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['high', 'medium', 'low'];

export interface UnresolvedItemInput {
  candidateId: string;
  rawText: string;
  currentName: string;
  currentQuantity: number;
  currentUnit: string | null;
  currentCategoryName: string | null;
}

export interface AiAssistantRequest {
  language: string;
  categories: string[];
  items: UnresolvedItemInput[];
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

export interface AiAssistantResponse {
  providerId: string;
  suggestions: AiAssistantSuggestion[];
  warnings: string[];
}

// What the AI provider (see providers/ClaudeProvider.ts) actually
// returns before this function re-validates it against the request -
// flat value+confidence pairs per field rather than nested objects,
// since a flatter JSON schema is what tool-calling models follow most
// reliably. Converted into AiAssistantSuggestion's nested shape only
// after every field survives validation below.
export interface RawProviderSuggestion {
  candidateId?: unknown;
  canonicalName?: unknown;
  canonicalNameConfidence?: unknown;
  category?: unknown;
  categoryConfidence?: unknown;
  quantity?: unknown;
  quantityConfidence?: unknown;
  unit?: unknown;
  unitConfidence?: unknown;
  notes?: unknown;
  notesConfidence?: unknown;
  reason?: unknown;
}

export function isValidAiAssistantRequest(body: unknown): body is AiAssistantRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.language !== 'string' || !b.language.trim()) return false;
  if (!Array.isArray(b.categories) || !b.categories.every((c) => typeof c === 'string')) return false;
  if (!Array.isArray(b.items) || b.items.length === 0) return false;
  // Bounded batch size - a single request should stay a single Claude
  // call regardless of how large a pasted list is, but an unbounded
  // batch risks an oversized prompt/timeout; the client is expected to
  // never need more than this per import in practice.
  if (b.items.length > 50) return false;
  return b.items.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const i = item as Record<string, unknown>;
    return (
      typeof i.candidateId === 'string' &&
      i.candidateId.length > 0 &&
      typeof i.rawText === 'string' &&
      typeof i.currentName === 'string' &&
      typeof i.currentQuantity === 'number' &&
      (i.currentUnit === null || typeof i.currentUnit === 'string') &&
      (i.currentCategoryName === null || typeof i.currentCategoryName === 'string')
    );
  });
}

function confidenceOrUndefined(value: unknown): ConfidenceLevel | null {
  return typeof value === 'string' && (CONFIDENCE_LEVELS as string[]).includes(value)
    ? (value as ConfidenceLevel)
    : null;
}

// Re-validates one model-produced suggestion against the ORIGINAL
// request, dropping anything that doesn't hold up: an unknown
// candidateId, a category not in the exact list this function sent the
// model, a missing/invalid confidence level, or a value of the wrong
// type. This is what "never invent unsupported fields" means in
// practice - not a prompt instruction alone, but a hard filter the
// model's output cannot get past.
export function sanitizeSuggestion(
  raw: RawProviderSuggestion,
  request: AiAssistantRequest
): AiAssistantSuggestion | null {
  if (typeof raw.candidateId !== 'string') return null;
  const knownItem = request.items.find((item) => item.candidateId === raw.candidateId);
  if (!knownItem) return null;

  const suggestion: AiAssistantSuggestion = { candidateId: raw.candidateId };

  const nameConfidence = confidenceOrUndefined(raw.canonicalNameConfidence);
  if (typeof raw.canonicalName === 'string' && raw.canonicalName.trim() && nameConfidence) {
    suggestion.canonicalName = { value: raw.canonicalName.trim(), confidence: nameConfidence };
  }

  const categoryConfidence = confidenceOrUndefined(raw.categoryConfidence);
  if (typeof raw.category === 'string' && categoryConfidence && request.categories.includes(raw.category)) {
    suggestion.category = { value: raw.category, confidence: categoryConfidence };
  }

  const quantityConfidence = confidenceOrUndefined(raw.quantityConfidence);
  if (typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) && raw.quantity > 0 && quantityConfidence) {
    suggestion.quantity = { value: raw.quantity, confidence: quantityConfidence };
  }

  const unitConfidence = confidenceOrUndefined(raw.unitConfidence);
  if (typeof raw.unit === 'string' && raw.unit.trim() && unitConfidence) {
    suggestion.unit = { value: raw.unit.trim(), confidence: unitConfidence };
  }

  const notesConfidence = confidenceOrUndefined(raw.notesConfidence);
  if (typeof raw.notes === 'string' && raw.notes.trim() && notesConfidence) {
    suggestion.notes = { value: raw.notes.trim(), confidence: notesConfidence };
  }

  if (typeof raw.reason === 'string' && raw.reason.trim()) {
    suggestion.reason = raw.reason.trim().slice(0, 300);
  }

  const hasAnyField =
    suggestion.canonicalName || suggestion.category || suggestion.quantity || suggestion.unit || suggestion.notes;
  return hasAnyField ? suggestion : null;
}
