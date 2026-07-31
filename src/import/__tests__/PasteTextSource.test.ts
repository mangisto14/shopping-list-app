import { describe, expect, it } from 'vitest';
import { pasteTextSource } from '../sources/PasteTextSource';

describe('pasteTextSource', () => {
  it('is always available', () => {
    expect(pasteTextSource.isAvailable()).toBe(true);
  });

  it('passes a text seed straight through', async () => {
    const result = await pasteTextSource.acquire({ kind: 'text', text: 'milk\nbread' });
    expect(result).toEqual({ kind: 'text', text: 'milk\nbread' });
  });

  it('rejects a missing or non-text seed', async () => {
    await expect(pasteTextSource.acquire()).rejects.toThrow();
    await expect(pasteTextSource.acquire({ kind: 'file', file: new File([], 'x.png') })).rejects.toThrow();
  });
});
