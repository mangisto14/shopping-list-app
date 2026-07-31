// src/import/sources/CameraSource.ts
// Stub for Phase 1: registered so it's visible in ImportSheet as
// "Coming Soon", but not implemented - `isAvailable()` is false, so
// ImportService/ImportSheet never call acquire() in practice. Once
// implemented, this will launch the device camera and produce a
// `{ kind: 'file' }` image, handled downstream by the same
// OcrExtractor that GallerySource/ImageSource use.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const cameraSource: ImportSource = {
  id: 'camera',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'camera');
  },
};
