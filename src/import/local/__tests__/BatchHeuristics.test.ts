import { describe, expect, it } from 'vitest';
import { detectBatchIssues } from '../BatchHeuristics';
import type { ImportItemCandidate } from '../../types';

function candidate(overrides: Partial<ImportItemCandidate>): ImportItemCandidate {
  return {
    id: 'c1',
    rawText: 'raw',
    name: 'item',
    quantity: 1,
    unit: null,
    categoryId: null,
    categoryName: null,
    notes: null,
    included: true,
    ...overrides,
  };
}

describe('detectBatchIssues', () => {
  it('never calls any network/AI API - a plain, local function', () => {
    expect(detectBatchIssues.toString()).not.toMatch(/fetch\(|XMLHttpRequest/);
  });

  it('flags a name with no real letters as ambiguous, leaves a normal name unflagged', () => {
    const result = detectBatchIssues([candidate({ id: 'c1', name: '123' }), candidate({ id: 'c2', name: 'שוקולד' })]);
    expect(result.find((e) => e.candidateId === 'c1')?.ambiguous).toBe(true);
    expect(result.find((e) => e.candidateId === 'c2')).toBeUndefined();
  });

  it('flags an exact within-batch duplicate (case/whitespace-insensitive)', () => {
    const result = detectBatchIssues([candidate({ id: 'c1', name: 'חלב' }), candidate({ id: 'c2', name: '  חלב  ' })]);
    expect(result.find((e) => e.candidateId === 'c2')?.duplicateOfCandidateId).toBe('c1');
    expect(result.find((e) => e.candidateId === 'c1')?.duplicateOfCandidateId).toBeUndefined();
  });

  it('flags a near-duplicate within edit-distance 2 on a long-enough name', () => {
    const result = detectBatchIssues([candidate({ id: 'c1', name: 'עגבניה' }), candidate({ id: 'c2', name: 'עגבניות' })]);
    expect(result.find((e) => e.candidateId === 'c2')?.duplicateOfCandidateId).toBe('c1');
  });

  it('does not flag unrelated names as duplicates', () => {
    const result = detectBatchIssues([candidate({ id: 'c1', name: 'חלב' }), candidate({ id: 'c2', name: 'לחם' })]);
    expect(result.find((e) => e.candidateId === 'c2')?.duplicateOfCandidateId).toBeUndefined();
  });

  it('never touches quantity, name, unit, category, or notes - only ambiguous/duplicate flags', () => {
    const result = detectBatchIssues([candidate({ id: 'c1', name: '  - חלב 3%  ,', quantity: 1 })]);
    const enrichment = result.find((e) => e.candidateId === 'c1');
    expect(enrichment?.name).toBeUndefined();
    expect(enrichment?.quantity).toBeUndefined();
    expect(enrichment?.unit).toBeUndefined();
    expect(enrichment?.category).toBeUndefined();
    expect(enrichment?.notes).toBeUndefined();
  });

  it('omits a candidate entirely when neither check finds anything', () => {
    const result = detectBatchIssues([candidate({ id: 'c1', name: 'חלב' })]);
    expect(result).toHaveLength(0);
  });
});
