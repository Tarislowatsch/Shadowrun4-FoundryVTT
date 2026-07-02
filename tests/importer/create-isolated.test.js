import { describe, it, expect } from 'vitest';
import { createIsolated } from '@importer/create-isolated.js';

describe('createIsolated', () => {
  it('returns no failures when every create succeeds', async () => {
    const { failures } = await createIsolated(
      [{ a: 1 }, { a: 2 }],
      async (data) => data
    );
    expect(failures).toEqual([]);
  });

  it('isolates a single failing entry instead of aborting the whole batch', async () => {
    const calls = [];
    const { failures } = await createIsolated(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      async (data) => {
        calls.push(data.id);
        if (data.id === 2) throw new Error('boom');
        return data;
      }
    );
    expect(calls).toEqual([1, 2, 3]);
    expect(failures).toHaveLength(1);
    expect(failures[0].data).toEqual({ id: 2 });
    expect(failures[0].error.message).toBe('boom');
  });

  it('reports every entry that fails', async () => {
    const { failures } = await createIsolated(
      [{ id: 1 }, { id: 2 }],
      async () => {
        throw new Error('nope');
      }
    );
    expect(failures).toHaveLength(2);
  });
});
