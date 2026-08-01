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
}
