// src/import/extractors/CsvExtractor.ts
// Stub for Phase 1. Once implemented, parses a `.csv` file into
// `{ kind: 'rows' }` (one array of cells per row, first row may be a
// header) for the AI Normalizer to interpret.
import type { Extractor, ExtractedContent, RawImportInput, ImportSourceId } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const csvExtractor: Extractor = {
  id: 'csv',
  accepts(input: RawImportInput, sourceId: ImportSourceId): boolean {
    return input.kind === 'file' && sourceId === 'csv';
  },
  async extract(): Promise<ExtractedContent> {
    throw new ImportNotImplementedError('extractor', 'csv');
  },
};
