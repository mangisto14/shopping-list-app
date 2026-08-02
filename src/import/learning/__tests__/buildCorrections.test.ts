import { describe, expect, it } from 'vitest';
import { buildApprovedCorrection, buildManualCorrection, buildPendingLearningSave, wasCandidateModified } from '../buildCorrections';
import type { ImportItemCandidate } from '../../types';

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: 'קישוא',
    name: 'קישוא',
    quantity: 1,
    unit: null,
    categoryId: null,
    categoryName: null,
    notes: null,
    included: true,
    ...overrides,
  };
}

describe('wasCandidateModified', () => {
  it('is false when nothing differs', () => {
    const c = candidate({});
    expect(wasCandidateModified(c, { ...c })).toBe(false);
  });

  it('is true for a name/category/unit/quantity change', () => {
    const original = candidate({});
    expect(wasCandidateModified(original, { ...original, name: 'אחר' })).toBe(true);
    expect(wasCandidateModified(original, { ...original, categoryId: 'cat-1' })).toBe(true);
    expect(wasCandidateModified(original, { ...original, unit: "יח'" })).toBe(true);
    expect(wasCandidateModified(original, { ...original, quantity: 2 })).toBe(true);
  });

  it('is true for a notes-only change, even though notes has no learnable column', () => {
    const original = candidate({ notes: null });
    expect(wasCandidateModified(original, { ...original, notes: 'קטנים בבקשה' })).toBe(true);
  });
});

describe('buildManualCorrection', () => {
  it('captures only the fields that changed, plus the mergeKey derived from the final name', () => {
    const original = candidate({ categoryId: null, unit: null, quantity: 1 });
    const edited = { ...original, categoryId: 'cat-fruit', quantity: 3 };
    expect(buildManualCorrection(original, edited)).toEqual({
      categoryId: 'cat-fruit',
      quantity: 3,
      mergeKey: 'קישוא',
    });
  });

  it('derives the mergeKey from the EDITED name, not the original one', () => {
    const original = candidate({ name: 'קישוא', categoryId: null });
    const edited = { ...original, name: 'קישוא 3%', categoryId: 'cat-fruit' };
    expect(buildManualCorrection(original, edited).mergeKey).toBe('קישוא');
  });

  it('does not learn clearing a unit', () => {
    const original = candidate({ unit: "יח'" });
    const edited = { ...original, unit: null };
    expect(buildManualCorrection(original, edited)).toEqual({});
  });
});

describe('buildApprovedCorrection', () => {
  it('learns only fields that were actually auto-applied (present in aiSuggestions, not pending), plus mergeKey', () => {
    const c = candidate({
      categoryId: 'cat-veg',
      categoryName: 'ירקות',
      aiSuggestions: { category: { confidence: 'medium' } },
    });
    expect(buildApprovedCorrection(c)).toEqual({ categoryId: 'cat-veg', mergeKey: 'קישוא' });
  });

  it('learns name/unit/quantity together when all were auto-applied', () => {
    const c = candidate({
      name: 'קישוא',
      unit: "יח'",
      quantity: 3,
      categoryId: 'cat-veg',
      aiSuggestions: {
        name: { confidence: 'high' },
        unit: { confidence: 'high' },
        quantity: { confidence: 'high' },
        category: { confidence: 'medium' },
      },
    });
    expect(buildApprovedCorrection(c)).toEqual({
      normalizedName: 'קישוא',
      unit: "יח'",
      quantity: 3,
      categoryId: 'cat-veg',
      mergeKey: 'קישוא',
    });
  });

  it('ignores a field still sitting as a pending (low-confidence, never applied) suggestion', () => {
    const c = candidate({
      unit: null,
      aiSuggestions: { unit: { confidence: 'low' } },
      aiPendingUnit: "יח'",
    });
    expect(buildApprovedCorrection(c)).toEqual({});
  });

  it('returns nothing when no stage ever suggested anything', () => {
    const c = candidate({});
    expect(buildApprovedCorrection(c)).toEqual({});
  });
});

describe('buildPendingLearningSave', () => {
  it('scenario: AI resolves קישוא -> Vegetables, user accepts without edits -> approved_ai save', () => {
    const original = candidate({
      categoryId: 'cat-veg',
      categoryName: 'ירקות',
      aiSuggestions: { category: { confidence: 'medium' } },
    });
    const edited = { ...original }; // untouched by the user

    const result = buildPendingLearningSave(original, edited);
    expect(result).toEqual({
      originalText: 'קישוא',
      correction: { categoryId: 'cat-veg', mergeKey: 'קישוא' },
      source: 'approved_ai',
    });
  });

  it('a manual edit still produces a manual save (no change from prior behavior)', () => {
    const original = candidate({ categoryId: null });
    const edited = { ...original, categoryId: 'cat-fruit' };

    const result = buildPendingLearningSave(original, edited);
    expect(result).toEqual({
      originalText: 'קישוא',
      correction: { categoryId: 'cat-fruit', mergeKey: 'קישוא' },
      source: 'manual',
    });
  });

  it('returns null when unmodified but nothing was ever resolved to approve', () => {
    const original = candidate({});
    expect(buildPendingLearningSave(original, { ...original })).toBeNull();
  });

  it('returns null when modified but the edit produced no learnable diff (e.g. notes-only)', () => {
    const original = candidate({ notes: null });
    const edited = { ...original, notes: 'קטנים בבקשה' };
    expect(buildPendingLearningSave(original, edited)).toBeNull();
  });
});
