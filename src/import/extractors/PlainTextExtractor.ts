// src/import/extractors/PlainTextExtractor.ts
// Phase 1's one real Extractor. Accepts text input from the
// paste-text source: splits into non-empty, trimmed lines. No
// quantity/unit/category guessing here - that's the AI Normalizer
// stage's job, not the Extractor's.
import type { Extractor, ExtractedContent, RawImportInput, ImportSourceId } from '../types';

export const plainTextExtractor: Extractor = {
  id: 'plain-text',
  accepts(input: RawImportInput, sourceId: ImportSourceId): boolean {
    return input.kind === 'text' && sourceId === 'paste-text';
  },
  async extract(input: RawImportInput): Promise<ExtractedContent> {
    if (input.kind !== 'text') {
      return { kind: 'lines', lines: [], warnings: ['PlainTextExtractor received non-text input'] };
    }
    const lines = input.text
      .split(/\r?\n|,/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return { kind: 'lines', lines, warnings: [] };
  },
};
