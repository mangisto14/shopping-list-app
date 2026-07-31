// src/import/sources/ExcelSource.ts
// Stub for Phase 1 - see CameraSource.ts for the shared rationale.
// Once implemented, opens a file picker restricted to .xlsx and
// produces a `{ kind: 'file' }`, handled downstream by ExcelExtractor.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const excelSource: ImportSource = {
  id: 'excel',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'excel');
  },
};
