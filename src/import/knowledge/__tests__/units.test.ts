import { describe, expect, it } from 'vitest';
import { isMeasurementUnit, normalizeUnit } from '../units';

describe('isMeasurementUnit', () => {
  it.each(['ק"ג', 'גרם', 'ליטר', 'מ"ל'])('%s is a measurement unit', (unit) => {
    expect(isMeasurementUnit(unit)).toBe(true);
  });

  it('the countable unit (יח\') is not a measurement unit', () => {
    expect(isMeasurementUnit("יח'")).toBe(false);
  });

  it('an arbitrary/unrecognized string is not a measurement unit', () => {
    expect(isMeasurementUnit('בקבוק')).toBe(false);
  });

  it('agrees with normalizeUnit\'s own canonical spellings for every synonym', () => {
    // Every synonym that normalizes to a measurement unit's canonical
    // spelling must itself be classified as a measurement unit -
    // isMeasurementUnit is always called on normalizeUnit's OUTPUT, so
    // this guards against the two ever drifting out of sync.
    for (const synonym of ['קילו', 'קג', 'kg', 'גר', 'gram', 'ל', 'liter', 'מל', 'ml']) {
      const canonical = normalizeUnit(synonym);
      expect(canonical).not.toBeNull();
      expect(isMeasurementUnit(canonical as string)).toBe(true);
    }
    for (const synonym of ['יח', 'יחידה', 'pcs']) {
      const canonical = normalizeUnit(synonym);
      expect(canonical).not.toBeNull();
      expect(isMeasurementUnit(canonical as string)).toBe(false);
    }
  });
});
