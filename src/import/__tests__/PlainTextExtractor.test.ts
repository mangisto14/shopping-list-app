import { describe, expect, it } from 'vitest';
import { plainTextExtractor } from '../extractors/PlainTextExtractor';

describe('plainTextExtractor', () => {
  it('accepts text input from paste-text, rejects anything else', () => {
    expect(plainTextExtractor.accepts({ kind: 'text', text: 'x' }, 'paste-text')).toBe(true);
    expect(plainTextExtractor.accepts({ kind: 'text', text: 'x' }, 'apple-reminders')).toBe(false);
    expect(plainTextExtractor.accepts({ kind: 'file', file: new File([], 'x.png') }, 'paste-text')).toBe(false);
  });

  it('splits on newlines and commas, dropping empty lines', async () => {
    const result = await plainTextExtractor.extract({
      kind: 'text',
      text: 'milk\n\nbread, eggs\n  tomatoes  ',
    });
    expect(result).toEqual({
      kind: 'lines',
      lines: ['milk', 'bread', 'eggs', 'tomatoes'],
      warnings: [],
    });
  });

  it('returns an empty result with a warning for non-text input', async () => {
    const result = await plainTextExtractor.extract({ kind: 'file', file: new File([], 'x.png') });
    expect(result.lines).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
