// src/import/extractors/ExcelExtractor.ts
// Stub for Phase 1. Once implemented, parses an `.xlsx` file into
// `{ kind: 'rows' }`, same shape CsvExtractor produces, so the AI
// Normalizer handles both identically.
import type { Extractor, ExtractedContent, RawImportInput, ImportSourceId } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const excelExtractor: Extractor = {
  id: 'excel',
  accepts(input: RawImportInput, sourceId: ImportSourceId): boolean {
    return input.kind === 'file' && sourceId === 'excel';
  },
  async extract(): Promise<ExtractedContent> {
    throw new ImportNotImplementedError('extractor', 'excel');
  },
};
