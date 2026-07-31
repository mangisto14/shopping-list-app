// src/import/extractors/OcrExtractor.ts
// Stub for Phase 1. Shared by camera/gallery/image sources - all three
// hand off the same shape (`{ kind: 'file' }`, an image), which is
// exactly the reuse the Source/Extractor split is meant to enable
// (see docs/smart-import-architecture.md). `accepts()` matches on
// file MIME type, not on which source produced it, since any image
// regardless of origin should be handled identically.
import type { Extractor, ExtractedContent, RawImportInput, ImportSourceId } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const ocrExtractor: Extractor = {
  id: 'ocr',
  accepts(input: RawImportInput, _sourceId: ImportSourceId): boolean {
    return input.kind === 'file' && input.file.type.startsWith('image/');
  },
  async extract(): Promise<ExtractedContent> {
    throw new ImportNotImplementedError('extractor', 'ocr');
  },
};
