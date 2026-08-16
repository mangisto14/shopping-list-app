import { describe, expect, it } from 'vitest';
import { chooseRicherName, computeMergeKey } from '../mergeKey';

describe('computeMergeKey', () => {
  describe('milk - quantity/percentage/package-size variants all share one identity', () => {
    it.each([
      ['חלב', 'חלב'],
      ['חלב 3%', 'חלב'],
      ['חלב 1%', 'חלב'],
      ['חלב 500 מ״ל', 'חלב'],
      ['חלב 500מ״ל', 'חלב'], // fused number+unit, no space
      ['1 ליטר חלב', 'חלב'], // leading quantity+unit too, not just trailing
    ])('%s -> %s', (input, expected) => {
      expect(computeMergeKey(input)).toBe(computeMergeKey(expected));
    });
  });

  describe('milk - a different base product never collapses into plain milk', () => {
    it.each([
      ['חלב שקדים', 'almond milk'],
      ['חלב סויה', 'soy milk'],
      ['חלב קוקוס', 'coconut milk'],
    ])('%s stays distinct from חלב (%s)', (input) => {
      expect(computeMergeKey(input)).not.toBe(computeMergeKey('חלב'));
    });

    it('soy milk and almond milk are also distinct from each other', () => {
      expect(computeMergeKey('חלב סויה')).not.toBe(computeMergeKey('חלב שקדים'));
    });
  });

  describe('rice - package sizes merge, product variants do not', () => {
    it('"אורז יסמין 1 ק"ג" and "אורז יסמין 500 גרם" share one identity', () => {
      expect(computeMergeKey('אורז יסמין 1 ק"ג')).toBe(computeMergeKey('אורז יסמין 500 גרם'));
    });

    it('jasmine rice and basmati rice stay distinct', () => {
      expect(computeMergeKey('אורז יסמין 1 ק"ג')).not.toBe(computeMergeKey('אורז בסמטי 1 ק"ג'));
    });
  });

  describe('flour - whole wheat vs white must not merge', () => {
    it('"קמח לבן 1 ק"ג" and "קמח לבן 5 ק"ג" merge', () => {
      expect(computeMergeKey('קמח לבן 1 ק"ג')).toBe(computeMergeKey('קמח לבן 5 ק"ג'));
    });

    it('white flour and whole-wheat flour stay distinct', () => {
      expect(computeMergeKey('קמח לבן 1 ק"ג')).not.toBe(computeMergeKey('קמח מלא 1 ק"ג'));
    });
  });

  describe('beverages - package sizes merge, distinct drinks/variants do not', () => {
    it('"קולה 1.5 ליטר" and "קולה 500 מ״ל" share one identity', () => {
      expect(computeMergeKey('קולה 1.5 ליטר')).toBe(computeMergeKey('קולה 500 מ״ל'));
    });

    it('Coke Zero never merges with regular Coke', () => {
      expect(computeMergeKey('קולה זירו 1.5 ליטר')).not.toBe(computeMergeKey('קולה 1.5 ליטר'));
    });

    it('a completely different drink never merges with cola', () => {
      expect(computeMergeKey('ספרייט 1.5 ליטר')).not.toBe(computeMergeKey('קולה 1.5 ליטר'));
    });
  });

  it('is case-insensitive for latin-script names', () => {
    expect(computeMergeKey('Milk 2%')).toBe(computeMergeKey('MILK'));
  });

  it('collapses internal whitespace the same way regardless of quantity tokens', () => {
    expect(computeMergeKey('חלב   3%')).toBe(computeMergeKey('חלב'));
  });

  it('never returns an empty string, even for a name that is only quantity tokens', () => {
    expect(computeMergeKey('500 גרם')).toBe('500 גרם'.toLowerCase());
  });

  it('returns the whole trimmed name unchanged when nothing looks like a quantity/unit/percent', () => {
    expect(computeMergeKey('שוקולד מריר')).toBe('שוקולד מריר');
  });

  describe('generic size-descriptor words (e.g. "גדול") also collapse into one identity', () => {
    it.each([
      ['קורנפלקס גדול', 'קורנפלקס'],
      ['חלב גדול', 'חלב'],
      ['לחם קטן', 'לחם'],
      ['גבינה בינונית', 'גבינה'],
    ])('%s -> %s', (input, expected) => {
      expect(computeMergeKey(input)).toBe(computeMergeKey(expected));
    });

    it('a genuinely different product is never conflated just because it also carries a size word', () => {
      expect(computeMergeKey('קורנפלקס גדול')).not.toBe(computeMergeKey('חלב גדול'));
    });

    it('a loanword size descriptor ("מיני") is also recognized, case-insensitively', () => {
      expect(computeMergeKey('עוגיות מיני')).toBe(computeMergeKey('עוגיות'));
      expect(computeMergeKey('Croissant Mini')).toBe(computeMergeKey('Croissant'));
    });
  });
});

describe('chooseRicherName', () => {
  it('prefers the name with more words', () => {
    expect(chooseRicherName('חלב', 'חלב 3%')).toBe('חלב 3%');
    expect(chooseRicherName('חלב 3%', 'חלב')).toBe('חלב 3%');
  });

  it('breaks a word-count tie by preferring the longer string', () => {
    expect(chooseRicherName('חלב א', 'חלב אאאא')).toBe('חלב אאאא');
  });

  it('keeps the existing name on a true tie (identical names)', () => {
    expect(chooseRicherName('קישוא', 'קישוא')).toBe('קישוא');
  });
});
