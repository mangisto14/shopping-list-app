// src/import/extractors/AppleRemindersExtractor.ts
// Stub for Phase 1. Keyed on `sourceId` (not just `input.kind`) since
// a text export from Apple Reminders is shape-identical to plain
// pasted text - see the note on Extractor.accepts in types.ts for why
// sourceId is passed alongside input rather than inferred from shape.
import type { Extractor, ExtractedContent, RawImportInput, ImportSourceId } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const appleRemindersExtractor: Extractor = {
  id: 'apple-reminders-export',
  accepts(_input: RawImportInput, sourceId: ImportSourceId): boolean {
    return sourceId === 'apple-reminders';
  },
  async extract(): Promise<ExtractedContent> {
    throw new ImportNotImplementedError('extractor', 'apple-reminders-export');
  },
};
