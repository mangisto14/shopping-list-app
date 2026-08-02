// src/import/learning/buildCorrections.ts
// Decides, per candidate, what (if anything) is worth learning from
// this import - and with what source/priority. Two paths:
//   - the user changed something in Preview -> a 'manual' correction,
//     exactly the pre-existing behavior (STEP2: "no change").
//   - the user left every field exactly as Preview presented it -> an
//     implicit approval of whatever Semantic Analysis/Learning/the AI
//     Assistant already resolved, saved as 'approved_ai'.
import type { ImportItemCandidate } from '../types';
import type { LearningCorrection, LearningSource, PendingLearningSave } from './types';

// Whether the user touched ANYTHING in Preview for this candidate -
// deliberately checks all 5 fields the spec calls out (name, category,
// quantity, unit, NOTES), even though `notes` has no learnable column
// of its own (see buildManualCorrection) - a notes-only edit is still
// a real edit, and must never be mistaken for silent approval.
export function wasCandidateModified(original: ImportItemCandidate, edited: ImportItemCandidate): boolean {
  return (
    edited.name !== original.name ||
    edited.categoryId !== original.categoryId ||
    edited.unit !== original.unit ||
    edited.quantity !== original.quantity ||
    edited.notes !== original.notes
  );
}

// The pre-existing manual-correction diff, unchanged in shape/behavior
// - only the fields that actually changed, and only when there's a
// genuine replacement value (clearing a unit isn't itself learned -
// see the original doc comment this was extracted from in
// ImportService.ts).
export function buildManualCorrection(original: ImportItemCandidate, edited: ImportItemCandidate): LearningCorrection {
  const correction: LearningCorrection = {};
  if (edited.name.trim() && edited.name !== original.name) correction.normalizedName = edited.name;
  if (edited.categoryId !== original.categoryId) correction.categoryId = edited.categoryId;
  if (edited.unit && edited.unit !== original.unit) correction.unit = edited.unit;
  if (edited.quantity !== original.quantity) correction.quantity = edited.quantity;
  return correction;
}

// What to learn from an UNMODIFIED candidate: only the fields some
// earlier stage actually resolved AND auto-applied to the real field -
// i.e. `aiSuggestions[field]` is set AND the matching `aiPending*`
// field is NOT set. A low-confidence suggestion still sitting in
// `aiPending*` was never actually accepted (the user may not have even
// noticed it) - learning from it here would be indistinguishable from
// blindly trusting a low-confidence guess, exactly what this pipeline
// has never done anywhere else.
export function buildApprovedCorrection(candidate: ImportItemCandidate): LearningCorrection {
  const suggestions = candidate.aiSuggestions;
  if (!suggestions) return {};

  const correction: LearningCorrection = {};

  if (suggestions.name && candidate.aiPendingName === undefined && candidate.name.trim()) {
    correction.normalizedName = candidate.name;
  }
  if (suggestions.category && candidate.aiPendingCategory === undefined) {
    correction.categoryId = candidate.categoryId;
  }
  if (suggestions.unit && candidate.aiPendingUnit === undefined && candidate.unit) {
    correction.unit = candidate.unit;
  }
  if (suggestions.quantity && candidate.aiPendingQuantity === undefined) {
    correction.quantity = candidate.quantity;
  }

  return correction;
}

// One candidate's worth of learning, or null when there's nothing
// worth saving - either because a real edit produced no learnable
// field diff (e.g. the user only cleared a unit, or only edited
// notes), or because an unmodified candidate had nothing any stage
// actually resolved to approve.
export function buildPendingLearningSave(
  original: ImportItemCandidate,
  edited: ImportItemCandidate
): PendingLearningSave | null {
  const modified = wasCandidateModified(original, edited);
  const source: LearningSource = modified ? 'manual' : 'approved_ai';
  const correction = modified ? buildManualCorrection(original, edited) : buildApprovedCorrection(edited);

  if (Object.keys(correction).length === 0) return null;
  return { originalText: original.rawText, correction, source };
}
