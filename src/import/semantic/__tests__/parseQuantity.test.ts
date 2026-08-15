import { describe, expect, it } from 'vitest';
import { parseQuantity } from '../parseQuantity';

describe('parseQuantity - the 9 formats required by the Phase 2B spec', () => {
  it('"3 מלפפון" - leading bare quantity', () => {
    expect(parseQuantity('3 מלפפון')).toMatchObject({ quantity: 3, quantityFound: true, unit: null, remainingText: 'מלפפון' });
  });

  it('"מלפפון 3" - trailing bare quantity', () => {
    expect(parseQuantity('מלפפון 3')).toMatchObject({ quantity: 3, quantityFound: true, unit: null, remainingText: 'מלפפון' });
  });

  it('"3x מלפפון" - leading multiplier, no space', () => {
    expect(parseQuantity('3x מלפפון')).toMatchObject({ quantity: 3, quantityFound: true, remainingText: 'מלפפון' });
  });

  it('"מלפפון x3" - trailing multiplier, no space', () => {
    expect(parseQuantity('מלפפון x3')).toMatchObject({ quantity: 3, quantityFound: true, remainingText: 'מלפפון' });
  });

  it('"מלפפון ×3" - trailing multiplier, multiplication sign', () => {
    expect(parseQuantity('מלפפון ×3')).toMatchObject({ quantity: 3, quantityFound: true, remainingText: 'מלפפון' });
  });

  it('"2 יח מלפפון" - leading quantity + unit word', () => {
    expect(parseQuantity('2 יח מלפפון')).toMatchObject({
      quantity: 2,
      unit: "יח'",
      unitFound: true,
      remainingText: 'מלפפון',
    });
  });

  it('"500 גרם גבינה" - leading quantity + unit', () => {
    expect(parseQuantity('500 גרם גבינה')).toMatchObject({
      quantity: 500,
      unit: 'גרם',
      unitFound: true,
      remainingText: 'גבינה',
    });
  });

  it('\'2 ק"ג תפוחים\' - leading quantity + quoted unit', () => {
    expect(parseQuantity('2 ק"ג תפוחים')).toMatchObject({
      quantity: 2,
      unit: 'ק"ג',
      unitFound: true,
      remainingText: 'תפוחים',
    });
  });

  it('"1.5 ליטר חלב" - decimal quantity + unit', () => {
    expect(parseQuantity('1.5 ליטר חלב')).toMatchObject({
      quantity: 1.5,
      unit: 'ליטר',
      unitFound: true,
      remainingText: 'חלב',
    });
  });
});

describe('parseQuantity - no quantity present', () => {
  it('returns quantityFound: false and the full text unchanged', () => {
    expect(parseQuantity('חלב')).toMatchObject({ quantity: 1, quantityFound: false, unit: null, unitFound: false, remainingText: 'חלב' });
  });

  it('does not mistake a short unit-like prefix for a quantity token: "מלפפון" alone is untouched', () => {
    // Regression guard for the prefix-ambiguity bug: "מל" (a unit
    // synonym for מ"ל) must never be read out of "מלפפון".
    const result = parseQuantity('מלפפון');
    expect(result.remainingText).toBe('מלפפון');
    expect(result.unitFound).toBe(false);
  });
});

describe('parseQuantity - English/Milk x2 case', () => {
  it('"Milk x2" - trailing multiplier on an English name', () => {
    expect(parseQuantity('Milk x2')).toMatchObject({ quantity: 2, quantityFound: true, remainingText: 'Milk' });
  });
});

describe('parseQuantity - AI Extraction & Enrichment Quality phase', () => {
  it('"גבינה צהובה 400 גרם" - trailing quantity + unit, multi-word name', () => {
    expect(parseQuantity('גבינה צהובה 400 גרם')).toMatchObject({
      quantity: 400,
      quantityFound: true,
      unit: 'גרם',
      unitFound: true,
      remainingText: 'גבינה צהובה',
    });
  });

  it('"500 מ״ל חלב" - leading quantity + unit typed with the Hebrew gershayim mark, not the ASCII quote', () => {
    expect(parseQuantity('500 מ״ל חלב')).toMatchObject({
      quantity: 500,
      quantityFound: true,
      unit: 'מ"ל',
      unitFound: true,
      remainingText: 'חלב',
    });
  });

  it('"חלב 3%" - a percentage must never be read as a quantity; the whole name is left untouched', () => {
    expect(parseQuantity('חלב 3%')).toMatchObject({
      quantity: 1,
      quantityFound: false,
      unit: null,
      unitFound: false,
      remainingText: 'חלב 3%',
    });
  });

  it('"חלב 3% 2 ליטר" - percentage stays part of the name; the trailing quantity+unit after it is still recognized', () => {
    expect(parseQuantity('חלב 3% 2 ליטר')).toMatchObject({
      quantity: 2,
      quantityFound: true,
      unit: 'ליטר',
      unitFound: true,
      remainingText: 'חלב 3%',
    });
  });

  it('"קורנפלקס גדול" - a non-numeric descriptive word is never mistaken for a quantity', () => {
    expect(parseQuantity('קורנפלקס גדול')).toMatchObject({
      quantity: 1,
      quantityFound: false,
      unit: null,
      unitFound: false,
      remainingText: 'קורנפלקס גדול',
    });
  });

  it('other descriptive percentages (0%, 1.5%, 5%) are equally never read as a quantity', () => {
    for (const pct of ['0%', '1.5%', '5%']) {
      const result = parseQuantity(`חלב ${pct}`);
      expect(result.quantityFound).toBe(false);
      expect(result.remainingText).toBe(`חלב ${pct}`);
    }
  });
});
