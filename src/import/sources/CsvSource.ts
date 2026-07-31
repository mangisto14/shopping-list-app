// src/import/sources/CsvSource.ts
// Stub for Phase 1 - see CameraSource.ts for the shared rationale.
// Once implemented, opens a file picker restricted to .csv and
// produces a `{ kind: 'file' }`, handled downstream by CsvExtractor.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const csvSource: ImportSource = {
  id: 'csv',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'csv');
  },
};
