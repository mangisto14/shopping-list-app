// src/import/ai-assistant/isUnresolved.ts
// Decides which candidates are still "unresolved" after Rule-Based
// Normalization + Semantic Analysis + Learning Lookup have all had
// their turn - only these are ever sent to the AI Assistant (STEP3:
// "Resolved items must never be sent").
//
// Matches the spec's own listed examples: missing category, missing
// unit, low confidence (any pending, unapplied AI/knowledge-base
// suggestion), and ambiguous product. "Missing quantity" is
// deliberately not modeled as its own signal - RuleBasedNormalizer/
// SemanticAnalysis together always resolve a valid quantity (defaulting
// to 1 when none was found in the text), so there is no honest
// "unknown quantity" state distinct from "quantity 1" to detect here;
// inventing one would mean guessing at intent no earlier stage
// actually expressed.
import type { ImportItemCandidate } from '../types';

export function isUnresolved(candidate: ImportItemCandidate): boolean {
  return (
    !candidate.categoryId ||
    !candidate.unit ||
    Boolean(candidate.aiAmbiguous) ||
    candidate.aiPendingName !== undefined ||
    candidate.aiPendingUnit !== undefined ||
    candidate.aiPendingCategory !== undefined ||
    candidate.aiPendingNotes !== undefined
  );
}
