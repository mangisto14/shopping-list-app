// src/import/ImportService.ts
// The only piece of this module the UI is allowed to talk to (besides
// types). Orchestrates:
//   Source -> Extractor -> Rule-Based Normalizer -> Validator ->
//   Semantic Analysis -> Local Batch Heuristics -> User Learning
//   Lookup -> AI Assistant (unresolved items only) -> Preview
// by looking providers up in their registries - it never imports a
// concrete provider directly by name, and never branches on which one
// is running.
import type {
  AddItemFn,
  AiItemEnrichment,
  ExistingItemForMerge,
  ImportItemCandidate,
  ImportPipelineContext,
  ImportService as ImportServiceType,
  ImportSourceId,
  RawImportInput,
  ValidatedImportResult,
} from './types';
import type { LearningCorrection } from './learning/types';
import type { UnresolvedItemForAi } from './ai-assistant/types';
import { ALL_SOURCES } from './sources/registerSources';
import { IMPORT_SOURCE_METADATA } from './sources/metadata';
import { ALL_EXTRACTORS } from './extractors/registerExtractors';
import { ALL_NORMALIZERS, DEFAULT_NORMALIZER_ID } from './normalizers/registerNormalizers';
import { ALL_VALIDATORS, DEFAULT_VALIDATOR_ID } from './validators/registerValidators';
import { applyAiEnrichments } from './ai/applyEnrichments';
import { normalizeForComparison } from './ai/textUtils';
import { analyzeCandidates } from './semantic/SemanticAnalyzer';
import { detectBatchIssues } from './local/BatchHeuristics';
import { learningRepository } from './learning/LearningRepository';
import { correctionsToEnrichments } from './learning/buildEnrichments';
import { isUnresolved } from './ai-assistant/isUnresolved';
import { suggestionsToEnrichments } from './ai-assistant/buildEnrichments';
import { ALL_AI_ASSISTANT_PROVIDERS, DEFAULT_AI_ASSISTANT_PROVIDER_ID } from './ai-assistant/registerAiAssistantProviders';

// Only ACTIVE items are eligible merge targets - a long-since-completed
// item shouldn't silently become the metadata source (and grouping
// target) for a fresh import; the user is about to buy the imported
// one, not the one they already checked off. Case/whitespace-
// insensitive match (reusing the exact same normalizeForComparison
// every other duplicate/match check in this module already uses) -
// but the row(s) actually inserted use the existing item's EXACT
// stored name, never the normalized form, since ShoppingList.tsx's
// clusterByName groups by exact string equality.
function buildActiveItemIndex(existingItems: ExistingItemForMerge[]): Map<string, ExistingItemForMerge> {
  const index = new Map<string, ExistingItemForMerge>();
  for (const item of existingItems) {
    if (item.isDone) continue;
    const key = normalizeForComparison(item.name);
    if (key && !index.has(key)) index.set(key, item);
  }
  return index;
}

function getSource(id: ImportSourceId) {
  const source = ALL_SOURCES.find((s) => s.id === id);
  if (!source) throw new Error(`Unknown import source: ${id}`);
  return source;
}

// Capability-based lookup (not a hardcoded source-id -> extractor-id
// map) - see the Extractor.accepts doc comment in types.ts for why
// sourceId is passed alongside the raw input.
function findExtractor(input: RawImportInput, sourceId: ImportSourceId) {
  const extractor = ALL_EXTRACTORS.find((e) => e.accepts(input, sourceId));
  if (!extractor) throw new Error(`No extractor registered for source "${sourceId}"`);
  return extractor;
}

function getDefaultNormalizer() {
  const normalizer = ALL_NORMALIZERS.find((n) => n.id === DEFAULT_NORMALIZER_ID);
  if (!normalizer) throw new Error('No default normalizer registered');
  return normalizer;
}

function getDefaultValidator() {
  const validator = ALL_VALIDATORS.find((v) => v.id === DEFAULT_VALIDATOR_ID);
  if (!validator) throw new Error('No default validator registered');
  return validator;
}

// Unlike the other "getDefault*" lookups above, an AI Assistant
// provider being absent or unavailable is a normal, fully-supported
// outcome (not an error) - "the application must always remain
// functional without AI". Returns null instead of throwing so
// runImport can fall back to whatever it already has.
function getAvailableAiAssistantProvider() {
  const provider = ALL_AI_ASSISTANT_PROVIDERS.find((p) => p.id === DEFAULT_AI_ASSISTANT_PROVIDER_ID);
  return provider ?? null;
}

// Every pipeline stage from Semantic Analysis onward shares the same
// fail-safe shape: compute this stage's enrichments, merge them via
// applyAiEnrichments, and never let a failure here block the import -
// the pipeline's output so far is already complete and valid on its
// own. Factored out once rather than repeating the same try/catch/
// console.error at each call site. Returns the stage's own enrichments
// alongside the merged candidates so a caller that needs to know
// exactly which candidates a stage touched (Learning Lookup, to
// exclude them from the AI Assistant batch) can do so without
// re-deriving it.
async function safelyEnrich(
  candidates: ImportItemCandidate[],
  stageName: string,
  buildEnrichments: () => Promise<AiItemEnrichment[]> | AiItemEnrichment[]
): Promise<{ candidates: ImportItemCandidate[]; enrichments: AiItemEnrichment[] }> {
  try {
    const enrichments = await buildEnrichments();
    return { candidates: applyAiEnrichments(candidates, enrichments), enrichments };
  } catch (err) {
    console.error(`Smart Import: ${stageName} failed, continuing without it`, err);
    return { candidates, enrichments: [] };
  }
}

export const importService: ImportServiceType = {
  async listSources() {
    return Promise.all(
      IMPORT_SOURCE_METADATA.map(async (meta) => ({
        meta,
        available: await getSource(meta.id).isAvailable(),
      }))
    );
  },

  async runImport(
    sourceId: ImportSourceId,
    context: ImportPipelineContext,
    seed?: RawImportInput
  ): Promise<ValidatedImportResult> {
    const source = getSource(sourceId);
    if (!(await source.isAvailable())) {
      throw new Error(`Import source "${sourceId}" is not available yet`);
    }

    const input = await source.acquire(seed);
    const extractor = findExtractor(input, sourceId);
    const extracted = await extractor.extract(input);

    const normalizer = getDefaultNormalizer();
    const normalized = await normalizer.normalize(extracted, context);

    const validator = getDefaultValidator();
    const { candidates, issues } = await validator.validate(normalized, context);

    // Semantic Analysis (Phase 2B): a deterministic, non-AI knowledge-
    // base lookup (see knowledge/ and semantic/parseQuantity.ts) - no
    // network call, no vendor SDK. Applied via applyAiEnrichments() so
    // its badges/pending-suggestion UI light up with zero Preview code
    // changes - every later stage reuses the exact same merge function
    // for the exact same reason.
    const semantic = await safelyEnrich(candidates, 'Semantic Analysis', () => analyzeCandidates(candidates, context));

    // Local Batch Heuristics (ambiguous-name flagging + within-batch
    // duplicate detection) - always on, no network, independent of
    // Learning/AI Assistant below (see local/BatchHeuristics.ts for why
    // these two checks aren't part of the AI Assistant's contract).
    const local = await safelyEnrich(semantic.candidates, 'local batch heuristics', () =>
      detectBatchIssues(semantic.candidates)
    );

    // User Learning Lookup (Phase 2C, STEP2/STEP6): before any AI call,
    // check for a past correction for each line. A hit is applied
    // immediately at high confidence (it's the user's own explicit,
    // past correction) - and, critically, this happens BEFORE the
    // unresolved-items filter below, so a learned item is genuinely
    // skipped from the AI Assistant batch entirely, not just re-
    // suggested alongside it.
    let learnedCandidates = local.candidates;
    // Every candidate id a learning correction actually touched -
    // tracked separately from "is this candidate still unresolved
    // after the merge" below, since STEP2 is unconditional ("If a
    // matching correction exists: use it, skip AI") - a correction
    // that only ever addressed category (say) still means "skip AI for
    // this item", even if it leaves unit unset. Re-sending it to AI
    // just because one other field remains empty would defeat the
    // entire point of learning from a past correction.
    let learnedCandidateIds = new Set<string>();
    if (context.userId) {
      const userId = context.userId;
      const learning = await safelyEnrich(local.candidates, 'learning lookup', async () => {
        const corrections = await learningRepository.lookupMany(userId, local.candidates.map((c) => c.rawText));
        return corrections.size > 0 ? correctionsToEnrichments(local.candidates, corrections, context) : [];
      });
      learnedCandidates = learning.candidates;
      learnedCandidateIds = new Set(learning.enrichments.map((e) => e.candidateId));
    }

    // AI Assistant (Phase 2C, STEP3): only candidates still unresolved
    // after Semantic Analysis, AND not already covered by a learning
    // hit above, are sent - batched into a single request. Resolved
    // items are never sent (STEP3), and "batch everything into a
    // single request" (STEP7) is exactly what one
    // `provider.enrich(unresolved, ...)` call below does, never one
    // call per item. Strictly additive and fail-safe, same discipline
    // as every earlier stage: a throw here must never block the import.
    let aiEngineId: string | undefined;
    let aiWarnings: string[] | undefined;
    let enrichedCandidates = learnedCandidates;

    const unresolved = learnedCandidates.filter((c) => !learnedCandidateIds.has(c.id) && isUnresolved(c));
    if (unresolved.length > 0) {
      const provider = getAvailableAiAssistantProvider();
      if (provider && (await provider.isAvailable())) {
        try {
          const items: UnresolvedItemForAi[] = unresolved.map((c) => ({
            candidateId: c.id,
            rawText: c.rawText,
            currentName: c.name,
            currentQuantity: c.quantity,
            currentUnit: c.unit,
            currentCategoryName: c.categoryName,
          }));
          const result = await provider.enrich(items, context);
          const enrichments = suggestionsToEnrichments(result.suggestions, context);
          enrichedCandidates = applyAiEnrichments(learnedCandidates, enrichments);
          aiEngineId = result.providerId;
          aiWarnings = result.warnings.length > 0 ? result.warnings : undefined;
        } catch (err) {
          console.error('Smart Import: AI Assistant failed, continuing with existing output', err);
        }
      }
    }

    return {
      sourceId,
      extractorId: extractor.id,
      normalizerId: normalizer.id,
      candidates: enrichedCandidates,
      issues,
      extractionWarnings: extracted.warnings,
      aiEngineId,
      aiWarnings,
    };
  },

  async commit(result: ValidatedImportResult, addItem: AddItemFn, existingItems: ExistingItemForMerge[] = []) {
    let committed = 0;
    let failed = 0;

    const activeItemByName = buildActiveItemIndex(existingItems);

    for (const candidate of result.candidates) {
      if (!candidate.included) continue;

      // Merge with an existing active item, if this candidate's FINAL
      // name (after Preview edits - `candidate` here is always
      // caller-supplied post-edit state, never the pipeline's original
      // output) matches one. Reusing its exact name/category/unit/
      // notes is what makes the newly inserted rows actually join its
      // existing "Nx" group (see buildActiveItemIndex's doc comment)
      // instead of starting a second, duplicate-looking one - no
      // existing row is read from again after this or modified.
      const match = activeItemByName.get(normalizeForComparison(candidate.name));
      const name = match ? match.name : candidate.name;
      const categoryId = match ? match.categoryId : candidate.categoryId;
      const unit = match ? match.unit : candidate.unit;
      const notes = match ? match.notes : candidate.notes;

      // "Quantity" reuses this app's existing convention (repeat-insert
      // N times) rather than a persisted quantity column - same
      // pattern QuickAddBar's stepper already uses via useItems(). This
      // is also how a merge "increases the existing quantity": every
      // one of these `candidate.quantity` new rows joins the matched
      // item's group, growing its displayed Nx count by exactly that
      // amount.
      for (let i = 0; i < candidate.quantity; i++) {
        const success = await addItem(name, categoryId, { unit, notes });
        if (success) committed += 1;
        else failed += 1;
      }
    }

    return { committed, failed };
  },

  async saveLearning(
    originalCandidates: ImportItemCandidate[],
    editedCandidates: ImportItemCandidate[],
    context: ImportPipelineContext
  ): Promise<void> {
    if (!context.userId) return;

    const originalById = new Map(originalCandidates.map((c) => [c.id, c]));
    // Collected first, then sent as ONE batched upsert (see
    // LearningRepository.saveCorrections) - correcting several rows in
    // a single import must not mean one network round-trip per row.
    const corrections: { originalText: string; correction: LearningCorrection }[] = [];

    for (const edited of editedCandidates) {
      const original = originalById.get(edited.id);
      if (!original) continue;

      const correction: LearningCorrection = {};
      if (edited.name.trim() && edited.name !== original.name) correction.normalizedName = edited.name;
      if (edited.categoryId !== original.categoryId) correction.categoryId = edited.categoryId;
      // Unlike category (where an explicit "no category" is itself a
      // meaningful correction), clearing a unit isn't treated as one -
      // there's no positive lesson to learn from "no unit", only from a
      // genuine replacement value.
      if (edited.unit && edited.unit !== original.unit) correction.unit = edited.unit;
      if (edited.quantity !== original.quantity) correction.quantity = edited.quantity;

      if (Object.keys(correction).length === 0) continue;
      corrections.push({ originalText: original.rawText, correction });
    }

    if (corrections.length === 0) return;
    await learningRepository.saveCorrections(context.userId, corrections);
  },
};
