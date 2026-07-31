// src/import/sources/AppleRemindersSource.ts
// Stub for Phase 1 - see CameraSource.ts for the shared rationale.
// Once implemented, this will hand off an Apple Reminders export
// (however that ends up being obtained - share sheet, file import,
// etc.) as text, handled downstream by AppleRemindersExtractor.
import type { ImportSource, RawImportInput } from '../types';
import { ImportNotImplementedError } from '../notImplemented';

export const appleRemindersSource: ImportSource = {
  id: 'apple-reminders',
  isAvailable: () => false,
  async acquire(): Promise<RawImportInput> {
    throw new ImportNotImplementedError('source', 'apple-reminders');
  },
};
