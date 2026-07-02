import { describe, it, expect, beforeEach } from 'vitest';
import { buildMagicContext } from '../src/sheets/characters/magic-context.js';

beforeEach(() => {
  globalThis.game.settings = { get: () => '' };
  globalThis.game.packs = { get: () => undefined };
  globalThis.game.user = {};
  globalThis.game.actors = [];
});

function makeSpiritActor(overrides = {}) {
  return {
    type: 'spirit',
    uuid: 'Actor.spirit1',
    img: 'icons/spirit.svg',
    name: 'Fire Spirit',
    system: {
      force: 3,
      spiritType: '',
      services: 1,
      ownerUuid: 'Actor.owner1',
    },
    testUserPermission: () => true,
    ...overrides,
  };
}

function makeActorData(overrides = {}) {
  return {
    system: {
      sheetStats: { WILLPOWER: 4, LOGIC: 5 },
      magic: {},
      ...overrides,
    },
  };
}

describe('buildMagicContext', () => {
  it('computes drain pool from WILLPOWER + drain attribute (default LOGIC)', async () => {
    const ctx = await buildMagicContext(makeActorData());
    expect(ctx.drainStatValue).toBe(5);
    expect(ctx.drainPool).toBe(9);
  });

  it('uses the configured drain attribute', async () => {
    const ctx = await buildMagicContext(
      makeActorData({ magic: { drainAttribute: 'WILLPOWER' } })
    );
    expect(ctx.drainStatValue).toBe(4);
    expect(ctx.drainPool).toBe(8);
  });

  it('reports hasMagic true for magicians', async () => {
    const magician = await buildMagicContext(
      makeActorData({ magic: { magician: true } })
    );
    expect(magician.hasMagic).toBe(true);
  });

  it('reports hasMagic true for adepts', async () => {
    const adept = await buildMagicContext(
      makeActorData({ magic: { adept: true } })
    );
    expect(adept.hasMagic).toBe(true);
  });

  it('reports hasMagic falsy for mundanes', async () => {
    const mundane = await buildMagicContext(makeActorData());
    expect(mundane.hasMagic).toBeFalsy();
  });

  it('builds spirit affinity categories from magic.spiritAffinities', async () => {
    const ctx = await buildMagicContext(
      makeActorData({ magic: { spiritAffinities: { COMBAT: 'Fire Spirit' } } })
    );
    expect(
      ctx.spiritAffinityCategories.find((c) => c.key === 'COMBAT').value
    ).toBe('Fire Spirit');
  });

  it('lists summoned spirits linked via ownerUuid', async () => {
    globalThis.game.actors = [makeSpiritActor()];
    const ctx = await buildMagicContext(makeActorData(), 'Actor.owner1');
    expect(ctx.summonedSpirits).toHaveLength(1);
    expect(ctx.summonedSpirits[0].uuid).toBe('Actor.spirit1');
    expect(ctx.summonedSpirits[0].entityType).toBe('spirit');
    expect(ctx.summonedSpirits[0].bound).toBe(false);
  });

  it('reports bound spirits as bound', async () => {
    globalThis.game.actors = [
      makeSpiritActor({ system: { ownerUuid: 'Actor.owner1', bound: true } }),
    ];
    const ctx = await buildMagicContext(makeActorData(), 'Actor.owner1');
    expect(ctx.summonedSpirits[0].bound).toBe(true);
  });

  it('excludes spirits owned by a different actor', async () => {
    globalThis.game.actors = [makeSpiritActor()];
    const ctx = await buildMagicContext(makeActorData(), 'Actor.someoneElse');
    expect(ctx.summonedSpirits).toEqual([]);
  });

  it('excludes spirits the current user lacks permission to observe', async () => {
    globalThis.game.actors = [
      makeSpiritActor({ testUserPermission: () => false }),
    ];
    const ctx = await buildMagicContext(makeActorData(), 'Actor.owner1');
    expect(ctx.summonedSpirits).toEqual([]);
  });

  it('returns no summoned spirits without an ownerUuid', async () => {
    globalThis.game.actors = [makeSpiritActor()];
    const ctx = await buildMagicContext(makeActorData());
    expect(ctx.summonedSpirits).toEqual([]);
  });
});
