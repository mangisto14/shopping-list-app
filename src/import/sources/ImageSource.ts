// src/import/sources/ImageSource.ts
// Stub for Phase 1. Named for what it produces (an image file),
// never for the app it came from - a screenshot shared from
// WhatsApp, Google Keep, or anywhere else is just one way a user
// attaches an image, not a distinct input type. See
// docs/smart-import-architecture.md ("Why the pipeline change
// reshapes the source list") for the full rationale. Once
// implemented, opens a generic file picker for image files and
// produces a `{ kind: 'file' }` image, handled downstream by the same
// OcrExtractor as CameraSource/GallerySource.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const imageSource: ImportSource = {
  id: 'image',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'image');
  },
};
