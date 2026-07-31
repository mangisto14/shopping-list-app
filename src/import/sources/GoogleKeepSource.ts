// src/import/sources/GoogleKeepSource.ts
// Stub for Phase 1 - see CameraSource.ts for the shared rationale.
// Once implemented, this will hand off a Google Keep export/share as
// text, handled downstream by GoogleKeepExtractor.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const googleKeepSource: ImportSource = {
  id: 'google-keep',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'google-keep');
  },
};
