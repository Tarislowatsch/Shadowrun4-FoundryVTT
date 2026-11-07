import { describe, it, expect } from 'vitest';
import {
  resolveSpellTargets,
  resolveTargetingMode,
  sharedHits,
} from '../src/domains/magic/spell-targeting.js';

const spell = (area) => ({ system: { area } });

describe('resolveTargetingMode', () => {
  it.each([
    [false, 0, 'single'],
    [false, 1, 'single'],
    [false, 3, 'split'],
    [true, 0, 'area'],
    [true, 1, 'area'],
    [true, 3, 'area'],
  ])('area=%s with %i targets -> %s', (area, count, expected) => {
    expect(resolveTargetingMode(spell(area), Array(count).fill({}))).toBe(
      expected
    );
  });
});

describe('sharedHits', () => {
  it('assigns the same hits to every target', () => {
    const a = { uuid: 'a' };
    const b = { uuid: 'b' };
    expect(sharedHits([a, b], 3)).toEqual([
      { target: a, hits: 3 },
      { target: b, hits: 3 },
    ]);
  });
});

describe('resolveSpellTargets', () => {
  const caster = { uuid: 'Actor.caster' };
  const marked = [{ uuid: 'Actor.a' }, { uuid: 'Actor.b' }];

  it('targets only the caster for self spells, ignoring marked tokens', () => {
    expect(
      resolveSpellTargets({ system: { range: 'SELF' } }, caster, marked)
    ).toEqual([caster]);
  });

  it.each(['LOS', 'TOUCH'])(
    'keeps the marked targets for %s spells',
    (range) => {
      expect(resolveSpellTargets({ system: { range } }, caster, marked)).toBe(
        marked
      );
    }
  );
});
