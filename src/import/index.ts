// src/import/index.ts
// Public API of the Smart Import module. This is the ONLY path the
// rest of the application is allowed to import from - never a
// subfolder (src/import/sources/PasteTextSource, src/import/
// normalizers/RuleBasedNormalizer, etc). The UI must not know which
// source/extractor/normalizer/validator is used, and this boundary is
// what makes that true structurally, not just by convention - same
// rule this codebase already follows for src/devtools.
export { importService } from './ImportService';
export { IMPORT_SOURCE_METADATA } from './sources/metadata';
export type {
  ImportSourceId,
  ImportSourceMeta,
  ImportPipelineContext,
  ImportItemCandidate,
  ValidatedImportResult,
  ValidationIssue,
  AddItemFn,
  ExistingItemForMerge,
} from './types';
