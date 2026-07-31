// src/import/extractors/GoogleKeepExtractor.ts
// Stub for Phase 1. Keyed on `sourceId`, same reasoning as
// AppleRemindersExtractor.ts.
import type { Extractor, ExtractedContent, RawImportInput, ImportSourceId } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const googleKeepExtractor: Extractor = {
  id: 'google-keep-export',
  accepts(_input: RawImportInput, sourceId: ImportSourceId): boolean {
    return sourceId === 'google-keep';
  },
  async extract(): Promise<ExtractedContent> {
    throw new ImportNotImplementedError('extractor', 'google-keep-export');
  },
};
