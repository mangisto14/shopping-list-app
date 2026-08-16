import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const eqMock = vi.fn();
const inMock = vi.fn();
const upsertMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../../../supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

// Rebuilds the chainable query mock before each test - `.from().select().eq().in()`
// is used both by lookupMany AND by saveCorrections' own priority
// check now (see LearningRepository.ts), `.from().upsert()` for the
// actual write. Since LearningRepository is a module-level singleton
// cache too (see MAX_CACHE_SIZE), each test also needs a fresh module
// instance so one test's cached lookups can't leak into the next.
beforeEach(async () => {
  vi.resetModules();
  selectMock.mockReset();
  eqMock.mockReset();
  inMock.mockReset();
  upsertMock.mockReset();
  fromMock.mockReset();

  selectMock.mockReturnValue({ eq: eqMock });
  eqMock.mockReturnValue({ in: inMock });
  fromMock.mockReturnValue({ select: selectMock, upsert: upsertMock });
  // Default: no existing rows for saveCorrections' priority check -
  // individual tests override this via inMock.mockResolvedValueOnce
  // when they need to simulate a pre-existing row.
  inMock.mockResolvedValue({ data: [], error: null });
  upsertMock.mockResolvedValue({ error: null });
});

async function importRepository() {
  const mod = await import('../LearningRepository');
  return mod.learningRepository;
}

describe('learningRepository.lookupMany', () => {
  it('queries once for every requested text and returns a normalized-text -> correction map', async () => {
    inMock.mockResolvedValue({
      data: [{ original_text: 'קישוא', normalized_name: null, category_id: 'cat-fruit', unit: null, quantity: null }],
      error: null,
    });

    const repo = await importRepository();
    const result = await repo.lookupMany('user-1', ['  קישוא  ', 'לחם']);

    expect(fromMock).toHaveBeenCalledWith('user_import_learning');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(inMock).toHaveBeenCalledTimes(1);
    expect(inMock).toHaveBeenCalledWith('original_text', ['קישוא', 'לחם']);
    expect(result.get('קישוא')).toEqual({ categoryId: 'cat-fruit' });
    expect(result.has('לחם')).toBe(false);
  });

  it('deduplicates repeated texts into a single query entry', async () => {
    const repo = await importRepository();
    await repo.lookupMany('user-1', ['קישוא', 'קישוא', ' קישוא ']);
    expect(inMock).toHaveBeenCalledWith('original_text', ['קישוא']);
  });

  it('caches both hits and misses - a second lookup for the same user+text makes no new query', async () => {
    inMock.mockResolvedValue({
      data: [{ original_text: 'קישוא', normalized_name: null, category_id: 'cat-fruit', unit: null, quantity: null }],
      error: null,
    });
    const repo = await importRepository();

    await repo.lookupMany('user-1', ['קישוא', 'לחם']); // 'לחם' is a miss
    expect(inMock).toHaveBeenCalledTimes(1);

    const second = await repo.lookupMany('user-1', ['קישוא', 'לחם']);
    expect(inMock).toHaveBeenCalledTimes(1); // still 1 - both served from cache
    expect(second.get('קישוא')).toEqual({ categoryId: 'cat-fruit' });
    expect(second.has('לחם')).toBe(false);
  });

  it('never throws on a query error - returns whatever was already resolvable', async () => {
    inMock.mockResolvedValue({ data: null, error: { message: 'network down' } });
    const repo = await importRepository();
    const result = await repo.lookupMany('user-1', ['קישוא']);
    expect(result.size).toBe(0);
  });

  it('does not distinguish manual from approved_ai rows - both come back as a plain correction', async () => {
    inMock.mockResolvedValue({
      data: [{ original_text: 'קישוא', normalized_name: null, category_id: 'cat-veg', unit: null, quantity: null }],
      error: null,
    });
    const repo = await importRepository();
    const result = await repo.lookupMany('user-1', ['קישוא']);
    // The row's `source` column is never selected/read for lookup
    // purposes at all - see LearningRepository.ts's own comment.
    expect(result.get('קישוא')).toEqual({ categoryId: 'cat-veg' });
  });

  it('includes a stored mergeKey in the returned correction when the row has one', async () => {
    inMock.mockResolvedValue({
      data: [
        {
          original_text: 'קולה זירו',
          normalized_name: 'קולה זירו',
          category_id: null,
          unit: null,
          quantity: null,
          merge_key: 'קולה זירו',
        },
      ],
      error: null,
    });
    const repo = await importRepository();
    const result = await repo.lookupMany('user-1', ['קולה זירו']);
    expect(result.get('קולה זירו')).toEqual({ normalizedName: 'קולה זירו', mergeKey: 'קולה זירו' });
  });

  it('omits mergeKey from the correction for a legacy row that predates the column', async () => {
    inMock.mockResolvedValue({
      data: [{ original_text: 'קישוא', normalized_name: null, category_id: 'cat-veg', unit: null, quantity: null }],
      error: null,
    });
    const repo = await importRepository();
    const result = await repo.lookupMany('user-1', ['קישוא']);
    expect(result.get('קישוא')).not.toHaveProperty('mergeKey');
  });
});

describe('learningRepository.lookupCategoriesByMergeKey', () => {
  it('queries by merge_key and returns a mergeKey -> categoryId map', async () => {
    inMock.mockResolvedValue({
      data: [{ merge_key: 'קורנפלקס', category_id: 'cat-breakfast', updated_at: '2026-08-01T00:00:00Z' }],
      error: null,
    });

    const repo = await importRepository();
    const result = await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס']);

    expect(fromMock).toHaveBeenCalledWith('user_import_learning');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(inMock).toHaveBeenCalledWith('merge_key', ['קורנפלקס']);
    expect(result.get('קורנפלקס')).toBe('cat-breakfast');
  });

  it('deduplicates repeated merge keys into a single query entry', async () => {
    const repo = await importRepository();
    await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס', 'קורנפלקס']);
    expect(inMock).toHaveBeenCalledWith('merge_key', ['קורנפלקס']);
  });

  it('excludes a row with no category_id from the result', async () => {
    inMock.mockResolvedValue({
      data: [{ merge_key: 'חלב', category_id: null, updated_at: '2026-08-01T00:00:00Z' }],
      error: null,
    });
    const repo = await importRepository();
    const result = await repo.lookupCategoriesByMergeKey('user-1', ['חלב']);
    expect(result.has('חלב')).toBe(false);
  });

  it('when two rows share a merge key, the most recently updated one wins', async () => {
    inMock.mockResolvedValue({
      data: [
        { merge_key: 'קורנפלקס', category_id: 'cat-old', updated_at: '2026-08-01T00:00:00Z' },
        { merge_key: 'קורנפלקס', category_id: 'cat-new', updated_at: '2026-08-10T00:00:00Z' },
      ],
      error: null,
    });
    const repo = await importRepository();
    const result = await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס']);
    expect(result.get('קורנפלקס')).toBe('cat-new');
  });

  it('caches both hits and misses - a second lookup makes no new query', async () => {
    inMock.mockResolvedValue({
      data: [{ merge_key: 'קורנפלקס', category_id: 'cat-breakfast', updated_at: '2026-08-01T00:00:00Z' }],
      error: null,
    });
    const repo = await importRepository();

    await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס', 'חלב']); // 'חלב' is a miss
    expect(inMock).toHaveBeenCalledTimes(1);

    const second = await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס', 'חלב']);
    expect(inMock).toHaveBeenCalledTimes(1); // still 1 - both served from cache
    expect(second.get('קורנפלקס')).toBe('cat-breakfast');
    expect(second.has('חלב')).toBe(false);
  });

  it('never throws on a query error - returns an empty map', async () => {
    inMock.mockResolvedValue({ data: null, error: { message: 'network down' } });
    const repo = await importRepository();
    const result = await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס']);
    expect(result.size).toBe(0);
  });

  it('a mergeKey saved via saveCorrections is immediately available without a query', async () => {
    const repo = await importRepository();

    await repo.saveCorrections('user-1', [
      { originalText: 'קורנפלקס גדול', correction: { categoryId: 'cat-breakfast', mergeKey: 'קורנפלקס' }, source: 'manual' },
    ]);
    inMock.mockClear();

    const result = await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס']);
    expect(inMock).not.toHaveBeenCalled();
    expect(result.get('קורנפלקס')).toBe('cat-breakfast');
  });

  it('a saved correction with no category is not cached for the merge-key fallback', async () => {
    const repo = await importRepository();

    await repo.saveCorrections('user-1', [
      { originalText: 'קורנפלקס גדול', correction: { unit: 'יח\'', mergeKey: 'קורנפלקס' }, source: 'manual' },
    ]);
    inMock.mockClear();
    inMock.mockResolvedValue({ data: [], error: null });

    const result = await repo.lookupCategoriesByMergeKey('user-1', ['קורנפלקס']);
    expect(inMock).toHaveBeenCalledTimes(1); // not served from cache - had to query
    expect(result.has('קורנפלקס')).toBe(false);
  });
});

describe('learningRepository.saveCorrections', () => {
  it('upserts only the provided fields plus source, normalizing the text key', async () => {
    const repo = await importRepository();

    await repo.saveCorrections('user-1', [
      { originalText: '  קישוא  ', correction: { categoryId: 'cat-fruit' }, source: 'approved_ai' },
    ]);

    expect(fromMock).toHaveBeenCalledWith('user_import_learning');
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          original_text: 'קישוא',
          category_id: 'cat-fruit',
          normalized_name: null,
          unit: null,
          quantity: null,
          merge_key: null,
          source: 'approved_ai',
        }),
      ],
      { onConflict: 'user_id,original_text' }
    );
  });

  it('writes a provided mergeKey to the merge_key column', async () => {
    const repo = await importRepository();

    await repo.saveCorrections('user-1', [
      { originalText: 'קולה זירו', correction: { normalizedName: 'קולה זירו', mergeKey: 'קולה זירו' }, source: 'manual' },
    ]);

    const [rows] = upsertMock.mock.calls[0];
    expect(rows[0].merge_key).toBe('קולה זירו');
  });

  it('sends every save from one call as a SINGLE batched upsert, never one request per row', async () => {
    const repo = await importRepository();

    await repo.saveCorrections('user-1', [
      { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' }, source: 'manual' },
      { originalText: 'חלב', correction: { unit: 'ליטר' }, source: 'approved_ai' },
    ]);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [rows] = upsertMock.mock.calls[0];
    expect(rows).toHaveLength(2);
    expect(rows.map((r: { original_text: string }) => r.original_text)).toEqual(['קישוא', 'חלב']);
  });

  it('makes no request at all when given an empty list', async () => {
    const repo = await importRepository();
    await repo.saveCorrections('user-1', []);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('populates the cache for every saved row so an immediate lookup does not re-query', async () => {
    const repo = await importRepository();

    await repo.saveCorrections('user-1', [
      { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' }, source: 'manual' },
      { originalText: 'חלב', correction: { unit: 'ליטר' }, source: 'approved_ai' },
    ]);
    inMock.mockClear();
    const result = await repo.lookupMany('user-1', ['קישוא', 'חלב']);

    expect(inMock).not.toHaveBeenCalled();
    expect(result.get('קישוא')).toEqual({ categoryId: 'cat-fruit' });
    expect(result.get('חלב')).toEqual({ unit: 'ליטר' });
  });

  it('never throws on a save error', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'write failed' } });
    const repo = await importRepository();
    await expect(
      repo.saveCorrections('user-1', [{ originalText: 'קישוא', correction: { unit: "יח'" }, source: 'manual' }])
    ).resolves.toBeUndefined();
  });

  it('never throws when the existing-row priority check itself fails', async () => {
    inMock.mockResolvedValue({ data: null, error: { message: 'network down' } });
    const repo = await importRepository();
    await expect(
      repo.saveCorrections('user-1', [{ originalText: 'קישוא', correction: { unit: "יח'" }, source: 'manual' }])
    ).resolves.toBeUndefined();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  describe('write priority (manual > approved_ai)', () => {
    it('a manual save is never blocked by an existing manual row - a user may re-correct their own correction', async () => {
      inMock.mockResolvedValue({ data: [{ original_text: 'קישוא', source: 'manual' }], error: null });
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' }, source: 'manual' },
      ]);

      expect(upsertMock).toHaveBeenCalledTimes(1);
    });

    it('an approved_ai save never overwrites an existing manual row', async () => {
      inMock.mockResolvedValue({ data: [{ original_text: 'קישוא', source: 'manual' }], error: null });
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-veg' }, source: 'approved_ai' },
      ]);

      expect(upsertMock).not.toHaveBeenCalled();
    });

    it('an approved_ai save may update an existing approved_ai row', async () => {
      inMock.mockResolvedValue({ data: [{ original_text: 'קישוא', source: 'approved_ai' }], error: null });
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' }, source: 'approved_ai' },
      ]);

      expect(upsertMock).toHaveBeenCalledTimes(1);
    });

    it('a manual save always overwrites an existing approved_ai row', async () => {
      inMock.mockResolvedValue({ data: [{ original_text: 'קישוא', source: 'approved_ai' }], error: null });
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' }, source: 'manual' },
      ]);

      expect(upsertMock).toHaveBeenCalledTimes(1);
    });

    it('treats a legacy row with no source value as manual - never overwritten by approved_ai', async () => {
      inMock.mockResolvedValue({ data: [{ original_text: 'קישוא', source: null }], error: null });
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-veg' }, source: 'approved_ai' },
      ]);

      expect(upsertMock).not.toHaveBeenCalled();
    });

    it('mixed batch: only the blocked entry is dropped, the rest still upsert in one call', async () => {
      inMock.mockResolvedValue({ data: [{ original_text: 'קישוא', source: 'manual' }], error: null });
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-veg' }, source: 'approved_ai' }, // blocked
        { originalText: 'חלב', correction: { unit: 'ליטר' }, source: 'approved_ai' }, // allowed, no existing row
      ]);

      expect(upsertMock).toHaveBeenCalledTimes(1);
      const [rows] = upsertMock.mock.calls[0];
      expect(rows).toHaveLength(1);
      expect(rows[0].original_text).toBe('חלב');
    });
  });

  describe('within-batch deduplication', () => {
    it('two saves for the same normalized text in one call collapse into one row - the later one wins', async () => {
      const repo = await importRepository();

      await repo.saveCorrections('user-1', [
        { originalText: 'קישוא', correction: { categoryId: 'cat-veg' }, source: 'approved_ai' },
        { originalText: 'קישוא', correction: { categoryId: 'cat-fruit' }, source: 'approved_ai' },
      ]);

      expect(upsertMock).toHaveBeenCalledTimes(1);
      const [rows] = upsertMock.mock.calls[0];
      expect(rows).toHaveLength(1);
      expect(rows[0].category_id).toBe('cat-fruit');
    });
  });
});
