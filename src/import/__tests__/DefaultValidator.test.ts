import { describe, expect, it } from 'vitest';
import { defaultValidator } from '../validators/DefaultValidator';
import type { ImportPipelineContext, NormalizedItemCandidate } from '../types';

const context: ImportPipelineContext = {
  existingCategories: [],
  existingItemNames: ['milk'],
};

function candidate(overrides: Partial<NormalizedItemCandidate>): NormalizedItemCandidate {
  return {
    id: 'c1',
    rawText: 'raw',
    name: 'bread',
    quantity: 1,
    unit: null,
    categoryGuess: null,
    notes: null,
    ...overrides,
  };
}

describe('defaultValidator', () => {
  it('resolves categoryGuess into categoryId/categoryName and defaults included to true', async () => {
    const { candidates, issues } = await defaultValidator.validate(
      [candidate({ categoryGuess: { id: 'cat-1', name: 'Bakery', confidence: 0.5 } })],
      context
    );
    expect(candidates[0]).toMatchObject({ categoryId: 'cat-1', categoryName: 'Bakery', included: true });
    expect(issues).toHaveLength(0);
  });

  it('flags a missing name as an error and excludes the row by default', async () => {
    const { candidates, issues } = await defaultValidator.validate([candidate({ name: '  ' })], context);
    expect(candidates[0].included).toBe(false);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'name', severity: 'error' })
    );
  });

  it('clamps an invalid quantity to 1 with a warning', async () => {
    const { candidates, issues } = await defaultValidator.validate([candidate({ quantity: -3 })], context);
    expect(candidates[0].quantity).toBe(1);
    expect(issues).toContainEqual(expect.objectContaining({ field: 'quantity', severity: 'warning' }));
  });

  it('warns when a candidate name matches an existing item on the list', async () => {
    const { issues } = await defaultValidator.validate([candidate({ name: 'Milk' })], context);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'name', severity: 'warning', message: expect.stringContaining('already') })
    );
  });

  it('warns on duplicate names within the same import batch', async () => {
    const { issues } = await defaultValidator.validate(
      [candidate({ id: 'c1', name: 'Eggs' }), candidate({ id: 'c2', name: 'eggs' })],
      context
    );
    expect(issues.filter((i) => i.message.toLowerCase().includes('duplicate row'))).toHaveLength(1);
  });
});
