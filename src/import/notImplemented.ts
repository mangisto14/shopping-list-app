// src/import/notImplemented.ts
// Shared by every stub Source/Extractor in Phase 1. Not a "provider
// depends on another provider" violation - it's generic infrastructure
// every stub uses independently, the same way every provider depends
// on types.ts without depending on each other.
export class ImportNotImplementedError extends Error {
  constructor(kind: 'source' | 'extractor', id: string) {
    super(`${kind} "${id}" is not implemented yet`);
    this.name = 'ImportNotImplementedError';
  }
}
