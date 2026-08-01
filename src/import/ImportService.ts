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
import { analyzeCandidates } from './semantic/SemanticAnalyzer';
import { detectBatchIssues } from './local/BatchHeuristics';
import { learningRepository } from './learning/LearningRepository';
import { correctionsToEnrichments } from './learning/buildEnrichments';
import { isUnresolved } from './ai-assistant/isUnresolved';
import { suggestionsToEnrichments } from './ai-assistant/buildEnrichments';
import { ALL_AI_ASSISTANT_PROVIDERS, DEFAULT_AI_ASSISTANT_PROVIDER_ID } from './ai-assistant/registerAiAssistantProviders';

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
    // network call, no vendor SDK. Strictly additive and fail-safe: a
    // throw here must never block the import flow. Applied via
    // applyAiEnrichments() so its badges/pending-suggestion UI light up
    // with zero Preview code changes - every later stage reuses the
    // exact same merge function for the exact same reason.
    let semanticCandidates = candidates;
    try {
      const semanticEnrichments = analyzeCandidates(candidates, context);
      semanticCandidates = applyAiEnrichments(candidates, semanticEnrichments);
    } catch (err) {
      console.error('Smart Import: Semantic Analysis failed, continuing with rule-based output', err);
    }

    // Local Batch Heuristics (ambiguous-name flagging + within-batch
    // duplicate detection) - always on, no network, independent of
    // Learning/AI Assistant below (see local/BatchHeuristics.ts for why
    // these two checks aren't part of the AI Assistant's contract).
    let localCandidates = semanticCandidates;
    try {
      const localEnrichments = detectBatchIssues(semanticCandidates);
      localCandidates = applyAiEnrichments(semanticCandidates, localEnrichments);
    } catch (err) {
      console.error('Smart Import: local batch heuristics failed, continuing without them', err);
    }

    // User Learning Lookup (Phase 2C, STEP2/STEP6): before any AI call,
    // check for a past correction for each line. A hit is applied
    // immediately at high confidence (it's the user's own explicit,
    // past correction) - and, critically, this happens BEFORE the
    // unresolved-items filter below, so a learned item is genuinely
    // skipped from the AI Assistant batch entirely, not just re-
    // suggested alongside it.
    let learnedCandidates = localCandidates;
    // Every candidate id a learning correction actually touched -
    // tracked separately from "is this candidate still unresolved
    // after the merge" below, since STEP2 is unconditional ("If a
    // matching correction exists: use it, skip AI") - a correction
    // that only ever addressed category (say) still means "skip AI for
    // this item", even if it leaves unit unset. Re-sending it to AI
    // just because one other field remains empty would defeat the
    // entire point of learning from a past correction.
    const learnedCandidateIds = new Set<string>();
    if (context.userId) {
      try {
        const corrections = await learningRepository.lookupMany(
          context.userId,
          localCandidates.map((c) => c.rawText)
        );
        if (corrections.size > 0) {
          const learningEnrichments = correctionsToEnrichments(localCandidates, corrections, context);
          for (const enrichment of learningEnrichments) learnedCandidateIds.add(enrichment.candidateId);
          learnedCandidates = applyAiEnrichments(localCandidates, learningEnrichments);
        }
      } catch (err) {
        console.error('Smart Import: learning lookup failed, continuing without it', err);
      }
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

  async commit(result: ValidatedImportResult, addItem: AddItemFn) {
    let committed = 0;
    let failed = 0;

    for (const candidate of result.candidates) {
      if (!candidate.included) continue;
      // "Quantity" reuses this app's existing convention (repeat-insert
      // N times) rather than a persisted quantity column - same
      // pattern QuickAddBar's stepper already uses via useItems().
      for (let i = 0; i < candidate.quantity; i++) {
        const success = await addItem(candidate.name, candidate.categoryId, {
          unit: candidate.unit,
          notes: candidate.notes,
        });
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

      await learningRepository.saveCorrection(context.userId, original.rawText, correction);
    }
  },
};
