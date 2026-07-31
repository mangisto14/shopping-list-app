// src/import/sources/PasteTextSource.ts
// Phase 1's one real Source. Always available (no permission, device,
// or file-picker dependency involved) - the raw text already lives in
// ImportSheet's own component state (a controlled textarea), so
// acquire() just validates and passes that seed straight through
// rather than reaching for anything itself.
import type { ImportSource, RawImportInput } from '../types';

export const pasteTextSource: ImportSource = {
  id: 'paste-text',
  isAvailable: () => true,
  async acquire(seed?: RawImportInput): Promise<RawImportInput> {
    if (!seed || seed.kind !== 'text') {
      throw new Error('PasteTextSource.acquire requires a text seed');
    }
    return seed;
  },
};
