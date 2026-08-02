// src/import/types.ts
// Shared contracts for the Smart Import pipeline:
//   Source -> Extractor -> Rule-Based Normalizer -> Validator ->
//   AI Analysis -> Preview -> Import
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
//
// `userId`/`language` (Phase 2C) are optional and additive: the
// Learning Lookup and AI Assistant stages need them, but every earlier
// stage (Normalizer/Validator/SemanticAnalysis) does not, and a caller
// that omits them simply gets those two stages skipped rather than an
// error - the same "missing capability degrades gracefully" discipline
// this pipeline already uses for an absent/unavailable AI engine.
export interface ImportPipelineContext {
  existingCategories: { id: string; name: string }[];
  existingItemNames: string[];
  userId?: string;
  language?: string;
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

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type AiEnrichableField = 'name' | 'quantity' | 'unit' | 'category' | 'notes';

export interface AiSuggestionMeta {
  confidence: ConfidenceLevel;
  reason?: string;
}

// The shape ImportPreview actually renders and edits - a superset of
// NormalizedItemCandidate: `categoryId`/`categoryName` are a resolved,
// user-editable choice (not just a guess), and `included` is the
// include/exclude toggle.
//
// The `ai*` fields below (Phase 2) are all optional/additive: a
// candidate with none of them set behaves exactly as it did in Phase
// 1 - existing consumers (ImportService.commit, which only reads
// name/quantity/unit/categoryId/notes/included) are unaffected. They
// exist purely so Preview can show which values came from AI Analysis
// and at what confidence, per the confidence rule:
//   high/medium  -> the real field above is already populated;
//                   aiSuggestions[field] records that + the
//                   confidence, so Preview can badge it
//                   (medium additionally gets highlighted).
//   low          -> the real field above is left as Validator
//                   produced it; the suggested value instead lives in
//                   the matching `aiPending*` field until the user
//                   explicitly applies it - never silently written in.
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
  aiSuggestions?: Partial<Record<AiEnrichableField, AiSuggestionMeta>>;
  aiPendingName?: string;
  aiPendingQuantity?: number;
  aiPendingUnit?: string;
  aiPendingCategory?: { id: string | null; name: string | null };
  aiPendingNotes?: string;
  // Whole-row flag: AI Analysis found this item ambiguous enough that
  // the user should look at it specifically (e.g. a name too short or
  // generic to be confident about). Never auto-resolved - Preview
  // just surfaces it; every field remains normally editable.
  aiAmbiguous?: boolean;
  // A suggested duplicate/merge target WITHIN THIS SAME import batch -
  // always a suggestion, never applied automatically. Preview offers
  // an explicit merge action; nothing merges without the user tapping it.
  aiDuplicateOfCandidateId?: string | null;
  // The generic, product-agnostic merge identity (see
  // semantic/mergeKey.ts) - always kept in sync with `name` by
  // applyAiEnrichments (never confidence-gated, never shown/edited in
  // Preview - there is no "aiPendingMergeKey"). Populated purely for
  // observability/testing; ImportService.commit()/saveLearning() never
  // trust a possibly-stale copy of this field - they always derive it
  // fresh from whichever `name` is final at that point (which also
  // correctly reflects a Preview name edit this field has no way to
  // react to on its own, since there is no Preview UI for it).
  mergeKey?: string;
}

// One field AI Analysis enriched for one candidate, with its
// confidence and (for category) the resolved id/name pair.
export interface AiEnrichedField {
  value: string | number | { id: string | null; name: string | null };
  confidence: ConfidenceLevel;
  reason?: string;
}

export interface AiItemEnrichment {
  candidateId: string;
  name?: AiEnrichedField;
  quantity?: AiEnrichedField;
  unit?: AiEnrichedField;
  category?: AiEnrichedField;
  notes?: AiEnrichedField;
  ambiguous?: boolean;
  duplicateOfCandidateId?: string | null;
  // An explicit override for the resolved merge identity - set only by
  // Learning Lookup, when a past correction stored one (see
  // learning/buildEnrichments.ts). Every other source leaves this
  // unset and lets applyAiEnrichments derive it generically from
  // whatever `name` ends up being instead (see mergeKey.ts).
  mergeKey?: string;
}

// Phase 2's TextUnderstandingEngine/AiAnalysisResult interfaces
// (the "AI Analysis" stage) were retired in Phase 2C - see
// src/import/ai-assistant/types.ts's AiAssistantProvider, which
// replaces it with a real, provider-agnostic AI stage backed by a
// Supabase Edge Function.

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
  // Since Phase 2C, this is the AI ASSISTANT provider's id (e.g.
  // 'claude') when it actually ran - see ai-assistant/types.ts. Absent
  // when there were no unresolved items left to send it (including
  // "Learning Lookup resolved everything, AI was skipped entirely"),
  // when no provider is registered, or when the call failed - the
  // pipeline falls back to whatever it already had in every case (see
  // ImportService.runImport), so this being unset is a normal,
  // fully-supported state, not an error.
  aiEngineId?: string;
  aiWarnings?: string[];
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

// A minimal, plain-data projection of useItems().items - just what
// commit()'s merge-with-existing-item logic needs (see its own doc
// comment). Deliberately its own small shape, not the app's `Item`
// interface from useItems.ts: services in this module never import a
// hook's types any more than they call the hook itself.
export interface ExistingItemForMerge {
  name: string;
  categoryId: string | null;
  unit: string | null;
  notes: string | null;
  isDone: boolean;
}

export interface ImportService {
  listSources(): Promise<{ meta: ImportSourceMeta; available: boolean }[]>;
  runImport(
    sourceId: ImportSourceId,
    context: ImportPipelineContext,
    seed?: RawImportInput
  ): Promise<ValidatedImportResult>;
  // `existingItems` (optional, defaults to none) enables the merge-
  // with-existing-item behavior below; a caller that omits it just
  // gets the previous, always-insert-new-rows behavior.
  //
  // Before inserting a candidate's rows, looks for an existing ACTIVE
  // (not done) item on the list whose generic merge identity
  // (mergeKey - see semantic/mergeKey.ts, computed from the candidate's
  // FINAL name after Preview edits) matches one, category
  // disambiguating only when more than one existing item shares that
  // mergeKey. mergeKey - not the full display name - is the identity:
  // "חלב 3%"/"חלב 500 מ״ל" merge into a plain existing "חלב" (same
  // product, different amount), while "חלב שקדים"/"חלב סויה" never do
  // (a different product). If found, the new rows are inserted using
  // the RICHER of the existing item's name and the candidate's own
  // (never silently dropping a more descriptive name - "never lose
  // useful information") plus the existing item's category/unit/notes
  // - this app's quantity model is "N rows sharing one name = an Nx
  // group" (see ShoppingList.tsx's clusterByName, which groups by
  // exact string equality *within* a category section), so reusing the
  // existing item's category/unit is what makes the newly inserted
  // rows actually join its existing group instead of silently starting
  // a second, differently-styled one - rather than literally updating
  // a `quantity` column, which does not exist on `items`. No existing
  // row is ever modified; only which name/metadata new rows are
  // inserted with changes.
  commit(
    result: ValidatedImportResult,
    addItem: AddItemFn,
    existingItems?: ExistingItemForMerge[]
  ): Promise<{ committed: number; failed: number }>;
  // Phase 2C: diffs the pipeline's original output (`originalCandidates`
  // - i.e. `runImport`'s own `result.candidates`, before any user edit)
  // against what the user actually confirmed (`editedCandidates`), and
  // persists ONLY the fields that genuinely changed as a learning
  // correction (STEP5: "Never store unchanged values"). A no-op when
  // `context.userId` is absent, or when a given row has no diff at all.
  saveLearning(
    originalCandidates: ImportItemCandidate[],
    editedCandidates: ImportItemCandidate[],
    context: ImportPipelineContext
  ): Promise<void>;
}
