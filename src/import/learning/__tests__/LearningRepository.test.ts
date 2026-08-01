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
// for lookups, `.from().upsert()` for saves - since LearningRepository
// is a module-level singleton cache too (see MAX_CACHE_SIZE), each test
// also needs a fresh module instance so one test's cached lookups can't
// leak into the next.
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
    inMock.mockResolvedValue({ data: [], error: null });
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
});

describe('learningRepository.saveCorrection', () => {
  it('upserts only the provided fields, normalizing the text key', async () => {
    upsertMock.mockResolvedValue({ error: null });
    const repo = await importRepository();

    await repo.saveCorrection('user-1', '  קישוא  ', { categoryId: 'cat-fruit' });

    expect(fromMock).toHaveBeenCalledWith('user_import_learning');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        original_text: 'קישוא',
        category_id: 'cat-fruit',
        normalized_name: null,
        unit: null,
        quantity: null,
      }),
      { onConflict: 'user_id,original_text' }
    );
  });

  it('populates the cache so an immediate lookup does not re-query', async () => {
    upsertMock.mockResolvedValue({ error: null });
    const repo = await importRepository();

    await repo.saveCorrection('user-1', 'קישוא', { categoryId: 'cat-fruit' });
    const result = await repo.lookupMany('user-1', ['קישוא']);

    expect(inMock).not.toHaveBeenCalled();
    expect(result.get('קישוא')).toEqual({ categoryId: 'cat-fruit' });
  });

  it('never throws on a save error', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'write failed' } });
    const repo = await importRepository();
    await expect(repo.saveCorrection('user-1', 'קישוא', { unit: "יח'" })).resolves.toBeUndefined();
  });
});
