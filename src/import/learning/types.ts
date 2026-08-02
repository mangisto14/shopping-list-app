// src/import/learning/types.ts
// A correction is deliberately a PARTIAL record - only the fields the
// user actually changed are ever present (see LearningRepository's own
// doc comment). `categoryId: null` is a meaningful, distinct value
// from "field absent" (the user explicitly cleared the category), so
// it's kept separate from `categoryId?: undefined` via the optional
// modifier alone rather than folding both into one nullable-and-
// optional field that couldn't tell the two apart.
export interface LearningCorrection {
  normalizedName?: string;
  categoryId?: string | null;
  unit?: string;
  quantity?: number;
  // The generic merge identity (see semantic/mergeKey.ts) resolved at
  // the moment this correction was saved - always derived from
  // whichever name is being learned alongside it, never an
  // independent/arbitrary value (see buildCorrections.ts). Stored so a
  // later import of the same text reuses it directly rather than
  // recomputing, keeping a user's past grouping decisions stable even
  // if the generic algorithm's own rules change later.
  mergeKey?: string;
}

// 'manual': the user explicitly typed/picked a different value in the
// editor. 'approved_ai': the user left Preview's values exactly as
// presented - an implicit approval of whatever Semantic Analysis/
// Learning/the AI Assistant already resolved. Lookup treats both
// identically (see LearningRepository.lookupMany); only a WRITE needs
// to know which one it is, so a lower-priority approved_ai save can
// never silently overwrite an existing manual row (see
// LearningRepository.saveCorrections's SOURCE_PRIORITY).
export type LearningSource = 'manual' | 'approved_ai';

export interface PendingLearningSave {
  originalText: string;
  correction: LearningCorrection;
  source: LearningSource;
}
