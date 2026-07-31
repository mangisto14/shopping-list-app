// src/import/types.ts
// Shared contracts for the Smart Import pipeline:
//   Source -> Extractor -> AI Normalizer -> Validator -> Preview
// See docs/smart-import-architecture.md for the full rationale. This
// file has zero business logic - it exists so every stage can depend
// on the same shapes without depending on each other's implementations.

export type ImportSourceId =
  | 'paste-text'
  | 'camera'
  | 'gallery'
  | 'image'
  | 'csv'
  | 'excel'
  | 'apple-reminders'
  | 'google-keep';

export type ExtractorId =
  | 'plain-text'
  | 'ocr'
  | 'csv'
  | 'excel'
  | 'apple-reminders-export'
  | 'google-keep-export';

// Static, UI-facing description of a source. Drives "show every
// provider, mark unavailable ones Coming Soon" - the UI never
// hardcodes its own provider list, it renders this.
export interface ImportSourceMeta {
  id: ImportSourceId;
  labelHe: string;
  labelEn: string;
  icon: string;
}

// What a Source hands to an Extractor. A closed union (not `unknown`)
// so an incompatible Source/Extractor pairing is a type-level question
// answerable by `Extractor.accepts()`, not a runtime surprise.
export type RawImportInput = { kind: 'text'; text: string } | { kind: 'file'; file: File };

// One input channel. Knows how to obtain raw input; knows nothing
// about parsing, OCR, or AI. `isAvailable()` covers "registered but
// not implemented yet" (every source except paste-text in Phase 1).
//
// `acquire(seed?)`: most sources (camera, a file picker, ...) acquire
// input themselves and ignore `seed` entirely. A source whose input is
// already sitting in UI state (paste-text's <textarea> value) instead
// just validates/passes `seed` straight through - this keeps the
// interface identical across every source rather than special-casing
// text sources with their own signature.
export interface ImportSource {
  id: ImportSourceId;
  isAvailable(): boolean | Promise<boolean>;
  acquire(seed?: RawImportInput): Promise<RawImportInput>;
}

// Output of the Extractor stage. Deliberately just two possible
// shapes - flat lines (pasted text, OCR output, Reminders/Keep
// exports) or tabular rows (CSV/Excel) - so every Normalizer only
// ever has to handle two cases, no matter how many Extractors exist.
export interface ExtractedContent {
  kind: 'lines' | 'rows';
  lines?: string[];
  rows?: string[][];
  warnings: string[];
}

// Turns raw input into ExtractedContent. `accepts()` lets
// ImportService pick an Extractor by capability rather than a
// hardcoded source-id -> extractor-id map, so a Source never needs to
// "know" which Extractor handles it. `sourceId` is passed alongside
// `input` (not left to be inferred from shape alone) because
// RawImportInput's shape is not always enough to disambiguate on its
// own - e.g. a plain pasted text and a future Apple Reminders text
// export are both just `{ kind: 'text' }`; an Extractor that needs to
// tell them apart checks `sourceId`, one that doesn't (like
// PlainTextExtractor, or OcrExtractor keying off file type) ignores it.
export interface Extractor {
  id: ExtractorId;
  accepts(input: RawImportInput, sourceId: ImportSourceId): boolean;
  extract(input: RawImportInput): Promise<ExtractedContent>;
}

// Assembled by ImportService from useCategories()/useItems() and
// passed down the pipeline. Neither Normalizer nor Validator is a
// hook, so they can't call useCategories/useItems themselves - this
// is how they get the same data without needing to be hooks.
export interface ImportPipelineContext {
  existingCategories: { id: string; name: string }[];
  existingItemNames: string[];
}

export interface NormalizedItemCandidate {
  id: string;
  rawText: string;
  name: string;
  quantity: number;
  unit: string | null;
  categoryGuess: { id: string; name: string; confidence: number } | null;
  notes: string | null;
}

// The AI Normalizer stage's contract. Provider-agnostic BY
// CONSTRUCTION: nothing here references Claude, OpenAI, or any
// vendor/model. Phase 1's only implementation (RuleBasedNormalizer)
// makes no network call at all. A future AI-backed implementation
// satisfies this exact same interface and is swapped in via
// registration - ImportService's orchestration never changes for it.
export interface Normalizer {
  id: string; // e.g. 'rule-based' - deliberately never a vendor name
  normalize(content: ExtractedContent, context: ImportPipelineContext): Promise<NormalizedItemCandidate[]>;
}

export interface ValidationIssue {
  candidateId: string;
  field: 'name' | 'quantity' | 'unit' | 'category' | 'notes';
  message: string;
  severity: 'warning' | 'error';
}

// The shape ImportPreview actually renders and edits - a superset of
// NormalizedItemCandidate: `categoryId`/`categoryName` are a resolved,
// user-editable choice (not just a guess), and `included` is the
// include/exclude toggle.
export interface ImportItemCandidate {
  id: string;
  rawText: string;
  name: string;
  quantity: number;
  unit: string | null;
  categoryId: string | null;
  categoryName: string | null;
  notes: string | null;
  included: boolean;
}

// What a Validator itself produces - just the candidates (in their
// final, Preview-editable shape) and any issues found. It has no
// business knowing which source/extractor/normalizer ran before it;
// ImportService attaches that orchestration metadata to build the
// full ValidatedImportResult below.
export interface ValidationOutput {
  candidates: ImportItemCandidate[];
  issues: ValidationIssue[];
}

export interface ValidatedImportResult extends ValidationOutput {
  sourceId: ImportSourceId;
  extractorId: ExtractorId;
  normalizerId: string;
  // Extractor-level warnings (e.g. "3 rows could not be read") aren't
  // tied to any one candidate row, unlike ValidationIssue - kept
  // separate rather than forcing a fake candidateId onto them.
  extractionWarnings: string[];
}

export interface Validator {
  id: string;
  validate(candidates: NormalizedItemCandidate[], context: ImportPipelineContext): Promise<ValidationOutput>;
}

// Matches useItems().addItem's signature exactly - ImportService.commit
// takes it as a parameter (services can't call hooks) rather than
// importing useItems itself, reusing the app's one existing
// item-creation path instead of inventing a second one.
export type AddItemFn = (
  name: string,
  categoryId: string | null,
  options?: { unit?: string | null; notes?: string | null }
) => Promise<boolean>;

export interface ImportService {
  listSources(): Promise<{ meta: ImportSourceMeta; available: boolean }[]>;
  runImport(
    sourceId: ImportSourceId,
    context: ImportPipelineContext,
    seed?: RawImportInput
  ): Promise<ValidatedImportResult>;
  commit(result: ValidatedImportResult, addItem: AddItemFn): Promise<{ committed: number; failed: number }>;
}
