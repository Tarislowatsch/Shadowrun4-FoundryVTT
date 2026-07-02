import { describe, it, expect, beforeEach } from 'vitest';
import { buildAffinityCategories } from '../src/sheets/characters/affinity-context.js';

beforeEach(() => {
  globalThis.game.settings = { get: () => '' };
  globalThis.game.packs = { get: () => undefined };
});

describe('buildAffinityCategories', () => {
  it('uses default categories and empty values without a configured pack', async () => {
    const result = await buildAffinityCategories(
      {},
      'sr4.magic.spiritAffinities',
      'spirit'
    );
    expect(result.map((c) => c.key)).toEqual([
      'COMBAT',
      'DETECTION',
      'HEALTH',
      'ILLUSION',
      'MANIPULATION',
    ]);
    expect(result.every((c) => c.options === null)).toBe(true);
  });

  it('carries over existing affinity values', async () => {
    const result = await buildAffinityCategories(
      { COMBAT: 'Fire Spirit' },
      'sr4.magic.spiritAffinities',
      'spirit'
    );
    expect(result.find((c) => c.key === 'COMBAT').value).toBe('Fire Spirit');
    expect(result.find((c) => c.key === 'DETECTION').value).toBe('');
  });

  it('uses the given category list for sprites', async () => {
    const result = await buildAffinityCategories(
      {},
      'sr4.matrix.spriteTypes',
      'sprite',
      ['COURIER', 'DATA']
    );
    expect(result.map((c) => c.key)).toEqual(['COURIER', 'DATA']);
  });

  it('resolves template names from the configured compendium', async () => {
    globalThis.game.settings = { get: () => 'world.spirits' };
    globalThis.game.packs = {
      get: () => ({
        getIndex: async () => [
          { name: 'Fire Spirit' },
          { name: 'Fire Spirit' },
        ],
      }),
    };
    const result = await buildAffinityCategories(
      {},
      'sr4.magic.spiritAffinities',
      'spirit'
    );
    expect(result[0].options).toEqual(['Fire Spirit']);
  });

  it('falls back to null options when the configured pack is missing', async () => {
    globalThis.game.settings = { get: () => 'missing.pack' };
    globalThis.game.packs = { get: () => undefined };
    const result = await buildAffinityCategories(
      {},
      'sr4.magic.spiritAffinities',
      'spirit'
    );
    expect(result[0].options).toBeNull();
  });
});
