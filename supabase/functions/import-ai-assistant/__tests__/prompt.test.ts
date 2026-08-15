// supabase/functions/import-ai-assistant/__tests__/prompt.test.ts
// Regression coverage for the AI Extraction & Enrichment Quality
// phase's prompt guidance: percentages/identity numbers must never be
// reported as a quantity, and a genuinely descriptive leftover word may
// go in notes. Content-only assertions (no live Claude call) - the
// actual quantity/percentage guarantee for the deterministic pipeline
// is enforced and tested independently in parseQuantity.test.ts /
// SemanticAnalyzer.test.ts; this only verifies the prompt still asks
// the model for the same behavior on genuinely unresolved items.
import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, buildUserMessage, IMPORT_ANALYSIS_SCHEMA } from '../prompt.ts';
import type { AiAssistantRequest } from '../schema.ts';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt('he', ['ירקות', 'מוצרי חלב']);

  it('instructs the model to never move a percentage/identity number into quantity', () => {
    expect(prompt).toMatch(/percentage/i);
    expect(prompt).toMatch(/not a quantity|never move a percentage/i);
  });

  it('instructs the model that a genuinely descriptive leftover word may go in notes', () => {
    expect(prompt).toMatch(/notes/i);
  });

  it('still states the exact allowed category list and the tool-only response rule (unchanged pre-existing guarantees)', () => {
    expect(prompt).toContain(JSON.stringify(['ירקות', 'מוצרי חלב']));
    expect(prompt).toContain('You must respond ONLY by calling the tool.');
  });

  it('is deterministic given the same inputs (no randomness/timestamps baked in)', () => {
    expect(buildSystemPrompt('he', ['ירקות'])).toBe(buildSystemPrompt('he', ['ירקות']));
  });
});

describe('buildUserMessage', () => {
  it('includes every item\'s raw text and current known fields, and nothing else', () => {
    const request: AiAssistantRequest = {
      language: 'he',
      categories: ['ירקות'],
      items: [
        {
          candidateId: 'c1',
          rawText: 'קורנפלקס גדול',
          currentName: 'קורנפלקס גדול',
          currentQuantity: 1,
          currentUnit: null,
          currentCategoryName: null,
        },
      ],
    };
    const message = buildUserMessage(request);
    expect(message).toContain('קורנפלקס גדול');
    expect(message).toContain('c1');
  });
});

describe('IMPORT_ANALYSIS_SCHEMA', () => {
  it('only allows the exact fields the AI OUTPUT contract specifies - never an arbitrary field', () => {
    const properties = Object.keys(IMPORT_ANALYSIS_SCHEMA.properties.suggestions.items.properties);
    expect(properties.sort()).toEqual(
      [
        'candidateId',
        'canonicalName',
        'canonicalNameConfidence',
        'category',
        'categoryConfidence',
        'quantity',
        'quantityConfidence',
        'unit',
        'unitConfidence',
        'notes',
        'notesConfidence',
        'reason',
      ].sort()
    );
  });
});
