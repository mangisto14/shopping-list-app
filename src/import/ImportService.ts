// src/import/ImportService.ts
// The only piece of this module the UI is allowed to talk to (besides
// types). Orchestrates Source -> Extractor -> Rule-Based Normalizer ->
// Validator -> AI Analysis by looking providers up in their
// registries - it never imports a concrete provider directly by name,
// and never branches on which one is running.
import type {
  AddItemFn,
  ImportPipelineContext,
  ImportService as ImportServiceType,
  ImportSourceId,
  RawImportInput,
  ValidatedImportResult,
} from './types';
import { ALL_SOURCES } from './sources/registerSources';
import { IMPORT_SOURCE_METADATA } from './sources/metadata';
import { ALL_EXTRACTORS } from './extractors/registerExtractors';
import { ALL_NORMALIZERS, DEFAULT_NORMALIZER_ID } from './normalizers/registerNormalizers';
import { ALL_VALIDATORS, DEFAULT_VALIDATOR_ID } from './validators/registerValidators';
import { ALL_AI_ENGINES, DEFAULT_AI_ENGINE_ID } from './ai/registerAiEngines';
import { applyAiEnrichments } from './ai/applyEnrichments';
import { analyzeCandidates } from './semantic/SemanticAnalyzer';

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

// Unlike the other "getDefault*" lookups above, an AI engine being
// absent or unavailable is a normal, fully-supported outcome (not an
// error) - "the application must always remain functional without
// AI". Returns null instead of throwing so runImport can fall back to
// Validator's output untouched.
function getAvailableAiEngine() {
  const engine = ALL_AI_ENGINES.find((e) => e.id === DEFAULT_AI_ENGINE_ID);
  return engine ?? null;
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
    // network call, no vendor SDK. Strictly additive and fail-safe,
    // same discipline as the AI Analysis stage below: a throw here
    // must never block the import flow. Applied via the exact same
    // applyAiEnrichments() merge function the AI Analysis stage uses,
    // so its badges/pending-suggestion UI light up with zero Preview
    // code changes.
    let semanticCandidates = candidates;
    try {
      const semanticEnrichments = analyzeCandidates(candidates, context);
      semanticCandidates = applyAiEnrichments(candidates, semanticEnrichments);
    } catch (err) {
      console.error('Smart Import: Semantic Analysis failed, continuing with rule-based output', err);
    }

    // AI Analysis: strictly additive and fail-safe. An unavailable
    // engine, or one that throws, must never block the import flow -
    // the pipeline's output so far is already complete and valid on
    // its own, so on any failure we just return it as-is rather than
    // retrying or surfacing an error to the user.
    //
    // Runs on `semanticCandidates`, not `candidates` - its own guards
    // (`if (!candidate.unit)`, `if (!candidate.categoryId)`) naturally
    // skip any field Semantic Analysis already resolved, so the two
    // stages never fight over the same field.
    let aiEngineId: string | undefined;
    let aiWarnings: string[] | undefined;
    let enrichedCandidates = semanticCandidates;

    const engine = getAvailableAiEngine();
    if (engine && (await engine.isAvailable())) {
      try {
        const analysis = await engine.analyze(semanticCandidates, context);
        enrichedCandidates = applyAiEnrichments(semanticCandidates, analysis.enrichments);
        aiEngineId = analysis.engineId;
        aiWarnings = analysis.warnings.length > 0 ? analysis.warnings : undefined;
      } catch (err) {
        console.error('Smart Import: AI Analysis failed, continuing with rule-based output', err);
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
};
