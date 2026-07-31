// src/import/sources/GallerySource.ts
// Stub for Phase 1 - see CameraSource.ts for the shared rationale.
// Once implemented, opens the device photo picker and produces a
// `{ kind: 'file' }` image, handled downstream by OcrExtractor.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const gallerySource: ImportSource = {
  id: 'gallery',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'gallery');
  },
};
