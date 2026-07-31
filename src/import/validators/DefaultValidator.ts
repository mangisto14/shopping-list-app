// src/import/validators/DefaultValidator.ts
// Phase 1's one Validator. Required-field checks, quantity sanity
// clamping, and duplicate-name detection (against both the list's
// existing items and other rows in this same import batch) - surfaced
// as non-fatal warnings, since every field remains editable in
// ImportPreview and a duplicate isn't necessarily unwanted (e.g. the
// user really does want a second carton of milk).
import type {
  ImportItemCandidate,
  ImportPipelineContext,
  NormalizedItemCandidate,
  ValidationIssue,
  ValidationOutput,
  Validator,
} from '../types';

export const defaultValidator: Validator = {
  id: 'default',
  async validate(
    candidates: NormalizedItemCandidate[],
    context: ImportPipelineContext
  ): Promise<ValidationOutput> {
    const issues: ValidationIssue[] = [];
    const existingLower = new Set(context.existingItemNames.map((n) => n.trim().toLowerCase()));
    const seenInBatch = new Set<string>();

    const resolved: ImportItemCandidate[] = candidates.map((candidate) => {
      const trimmedName = candidate.name.trim();
      if (!trimmedName) {
        issues.push({ candidateId: candidate.id, field: 'name', message: 'Missing item name', severity: 'error' });
      }

      const quantity = Number.isFinite(candidate.quantity) && candidate.quantity > 0
        ? Math.floor(candidate.quantity)
        : 1;
      if (quantity !== candidate.quantity) {
        issues.push({
          candidateId: candidate.id,
          field: 'quantity',
          message: 'Invalid quantity, defaulted to 1',
          severity: 'warning',
        });
      }

      const lowerName = trimmedName.toLowerCase();
      if (lowerName && existingLower.has(lowerName)) {
        issues.push({
          candidateId: candidate.id,
          field: 'name',
          message: 'A similar item is already on this list',
          severity: 'warning',
        });
      }
      if (lowerName && seenInBatch.has(lowerName)) {
        issues.push({
          candidateId: candidate.id,
          field: 'name',
          message: 'Duplicate row within this import',
          severity: 'warning',
        });
      }
      if (lowerName) seenInBatch.add(lowerName);

      return {
        id: candidate.id,
        rawText: candidate.rawText,
        name: trimmedName,
        quantity,
        unit: candidate.unit,
        categoryId: candidate.categoryGuess?.id ?? null,
        categoryName: candidate.categoryGuess?.name ?? null,
        notes: candidate.notes,
        // Rows missing a name start deselected (nothing useful to
        // commit); everything else - including likely duplicates -
        // starts included, since a duplicate warning is informational,
        // not a reason to silently drop the row for the user.
        included: trimmedName.length > 0,
      };
    });

    return { candidates: resolved, issues };
  },
};
