import { describe, expect, it } from 'vitest';
import { isValidAiAssistantRequest, sanitizeSuggestion, type AiAssistantRequest } from '../schema.ts';

const validRequest: AiAssistantRequest = {
  language: 'he',
  categories: ['ירקות', 'פירות'],
  items: [
    {
      candidateId: 'c1',
      rawText: 'קישוא',
      currentName: 'קישוא',
      currentQuantity: 1,
      currentUnit: null,
      currentCategoryName: null,
    },
  ],
};

describe('isValidAiAssistantRequest', () => {
  it('accepts a well-formed request', () => {
    expect(isValidAiAssistantRequest(validRequest)).toBe(true);
  });

  it('rejects a missing/empty language', () => {
    expect(isValidAiAssistantRequest({ ...validRequest, language: '' })).toBe(false);
    expect(isValidAiAssistantRequest({ ...validRequest, language: undefined })).toBe(false);
  });

  it('rejects non-array categories or non-string entries', () => {
    expect(isValidAiAssistantRequest({ ...validRequest, categories: 'ירקות' })).toBe(false);
    expect(isValidAiAssistantRequest({ ...validRequest, categories: [1, 2] })).toBe(false);
  });

  it('rejects an empty items array', () => {
    expect(isValidAiAssistantRequest({ ...validRequest, items: [] })).toBe(false);
  });

  it('rejects a batch over 50 items', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ ...validRequest.items[0], candidateId: `c${i}` }));
    expect(isValidAiAssistantRequest({ ...validRequest, items })).toBe(false);
  });

  it('rejects an item missing a required field', () => {
    const items = [{ ...validRequest.items[0], candidateId: undefined }];
    expect(isValidAiAssistantRequest({ ...validRequest, items })).toBe(false);
  });

  it('rejects a completely malformed body', () => {
    expect(isValidAiAssistantRequest(null)).toBe(false);
    expect(isValidAiAssistantRequest('not an object')).toBe(false);
    expect(isValidAiAssistantRequest(42)).toBe(false);
  });
});

describe('sanitizeSuggestion', () => {
  it('accepts a fully valid suggestion', () => {
    const result = sanitizeSuggestion(
      {
        candidateId: 'c1',
        canonicalName: 'קישוא',
        canonicalNameConfidence: 'high',
        category: 'ירקות',
        categoryConfidence: 'medium',
        quantity: 2,
        quantityConfidence: 'high',
        unit: "יח'",
        unitConfidence: 'low',
        notes: 'Buy the smaller ones',
        notesConfidence: 'low',
        reason: 'Common vegetable',
      },
      validRequest
    );
    expect(result).toEqual({
      candidateId: 'c1',
      canonicalName: { value: 'קישוא', confidence: 'high' },
      category: { value: 'ירקות', confidence: 'medium' },
      quantity: { value: 2, confidence: 'high' },
      unit: { value: "יח'", confidence: 'low' },
      notes: { value: 'Buy the smaller ones', confidence: 'low' },
      reason: 'Common vegetable',
    });
  });

  it('drops an unknown candidateId entirely - never fabricated', () => {
    expect(sanitizeSuggestion({ candidateId: 'not-a-real-id', category: 'ירקות', categoryConfidence: 'high' }, validRequest)).toBeNull();
  });

  it('drops a category not in the exact list the request sent - never invented', () => {
    const result = sanitizeSuggestion(
      { candidateId: 'c1', category: 'קטגוריה שלא קיימת', categoryConfidence: 'high' },
      validRequest
    );
    expect(result?.category).toBeUndefined();
  });

  it('drops a field with a missing or invalid confidence level', () => {
    const result = sanitizeSuggestion(
      { candidateId: 'c1', category: 'ירקות', categoryConfidence: 'certain' },
      validRequest
    );
    expect(result).toBeNull();
  });

  it('never accepts a numeric confidence', () => {
    const result = sanitizeSuggestion({ candidateId: 'c1', category: 'ירקות', categoryConfidence: 0.9 }, validRequest);
    expect(result).toBeNull();
  });

  it('drops a non-positive or non-finite quantity', () => {
    expect(
      sanitizeSuggestion({ candidateId: 'c1', quantity: -1, quantityConfidence: 'high' }, validRequest)?.quantity
    ).toBeUndefined();
    expect(
      sanitizeSuggestion({ candidateId: 'c1', quantity: Infinity, quantityConfidence: 'high' }, validRequest)?.quantity
    ).toBeUndefined();
  });

  it('returns null when nothing survives validation', () => {
    expect(sanitizeSuggestion({ candidateId: 'c1' }, validRequest)).toBeNull();
  });

  it('truncates an overly long reason rather than rejecting the whole suggestion', () => {
    const longReason = 'a'.repeat(1000);
    const result = sanitizeSuggestion(
      { candidateId: 'c1', category: 'ירקות', categoryConfidence: 'high', reason: longReason },
      validRequest
    );
    expect(result?.reason?.length).toBe(300);
  });
});
