// supabase/functions/import-ai-assistant/prompt.ts
// Builds the request sent to whichever AiProvider is configured (see
// providers/AiProvider.ts) - the prompt text and the JSON schema below
// are provider-agnostic inputs; a provider implementation decides how
// its own API wants them expressed (e.g. Claude's tool-calling
// `input_schema`), but the schema's actual field list is defined once,
// here, so a future provider can't quietly drift from what
// schema.ts's sanitizeSuggestion() expects on the way back.
import type { AiAssistantRequest } from './schema.ts';

export const IMPORT_ANALYSIS_TOOL_NAME = 'submit_import_analysis';

// A flat value+confidence pair per field (rather than a nested object)
// is deliberately what's asked for - simpler shapes are what
// tool-calling models follow most reliably, and schema.ts converts to
// the nested shape only after validating the response.
export const IMPORT_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'Must exactly match one of the candidateId values given in the request - never invented.' },
          canonicalName: { type: 'string' },
          canonicalNameConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string', description: 'Must be exactly one of the category names given in the request - never a new category name.' },
          categoryConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          quantity: { type: 'number' },
          quantityConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          unit: { type: 'string' },
          unitConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string', description: 'A short, genuinely useful note - omit entirely if there is nothing worth adding.' },
          notesConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string', description: 'One short sentence explaining the main suggestion. Optional.' },
        },
        required: ['candidateId'],
      },
    },
  },
  required: ['suggestions'],
} as const;

export function buildSystemPrompt(language: string, categories: string[]): string {
  return [
    'You are a grocery shopping list assistant helping resolve items a deterministic parser could not fully resolve on its own.',
    `The user's language is "${language}" - respond with names/units/notes in that language.`,
    '',
    'You will be given a list of items that are still missing a category, unit, or clear product name, or were flagged ambiguous or low-confidence by earlier processing.',
    '',
    `The ONLY category names you may use are exactly these (never invent a new one, never translate/rename one): ${JSON.stringify(categories)}.`,
    'If none of these categories genuinely fits an item, omit the category field entirely for that item rather than guessing.',
    '',
    'For every item you have something useful to add, call the submit_import_analysis tool with your suggestions. Only include a field when you are actually contributing information beyond what was already given - do not restate values you were not asked to change.',
    'Every field you set must come with a confidence level of exactly "high", "medium", or "low" - never a number, never any other word.',
    '',
    'A number that describes what the product itself IS - a fat percentage ("3%"), a strength, a size grade - is part of the product\'s identity, not a quantity. Only set the quantity field for a genuine count/amount of items being bought; never move a percentage or similar identity number out of the name and into quantity.',
    'A word that describes the product but does not belong in name, category, unit, or quantity (e.g. a size like "large"/"small", a variant, a brand) can go in notes instead of being dropped or awkwardly left fused into the name - but only when you are not already renaming/cleaning the name itself to include it.',
    'You must respond ONLY by calling the tool. Do not write any other text.',
  ].join('\n');
}

export function buildUserMessage(request: AiAssistantRequest): string {
  const lines = request.items.map((item) =>
    JSON.stringify({
      candidateId: item.candidateId,
      text: item.rawText,
      currentName: item.currentName,
      currentQuantity: item.currentQuantity,
      currentUnit: item.currentUnit,
      currentCategory: item.currentCategoryName,
    })
  );
  return `Resolve these ${request.items.length} shopping list item(s):\n${lines.join('\n')}`;
}
