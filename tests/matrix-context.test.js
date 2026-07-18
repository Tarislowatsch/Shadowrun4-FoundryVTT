import { describe, it, expect, beforeEach } from 'vitest';
import { buildMatrixContext } from '../src/sheets/characters/matrix-context.js';

beforeEach(() => {
  globalThis.game.settings = { get: () => '' };
  globalThis.game.packs = { get: () => undefined };
  globalThis.game.user = {};
  globalThis.game.actors = [];
});

function makeSpriteActor(overrides = {}) {
  return {
    type: 'sprite',
    uuid: 'Actor.sprite1',
    img: 'icons/sprite.svg',
    name: 'Courier Sprite',
    system: { rating: 3, spriteType: '', tasks: 1, ownerUuid: 'Actor.owner1' },
    testUserPermission: () => true,
    ...overrides,
  };
}

function makeActorData(technomancy = {}) {
  return {
    system: {
      sheetStats: {
        RESONANCE: 4,
        INTUITION: 3,
        WILLPOWER: 2,
        LOGIC: 5,
        CHARISMA: 1,
      },
      livingPersona: {},
      derivedStats: { initiative: { matrix: 6 } },
      technomancy: { technomancer: true, ...technomancy },
    },
  };
}

describe('buildMatrixContext', () => {
  it('returns an empty object for non-technomancers', async () => {
    const ctx = await buildMatrixContext({
      system: { technomancy: { technomancer: false } },
    });
    expect(ctx).toEqual({});
  });

  it('computes fadingPool from RESONANCE + fading attribute (default WILLPOWER)', async () => {
    const ctx = await buildMatrixContext(makeActorData());
    expect(ctx.fadingPool).toBe(4 + 2 + 0);
  });

  it('uses the configured fading attribute and compiling bonus', async () => {
    const ctx = await buildMatrixContext(
      makeActorData({ fadingAttribute: 'LOGIC', compilingFadingBonus: 2 })
    );
    expect(ctx.fadingPool).toBe(4 + 5 + 2);
  });

  it('computes living persona stats from sheet stats and bonuses', async () => {
    const ctx = await buildMatrixContext(makeActorData());
    expect(ctx.livingPersona.response).toBe(3);
    expect(ctx.livingPersona.signal).toBe(2);
    expect(ctx.livingPersona.firewall).toBe(2);
    expect(ctx.livingPersona.system).toBe(5);
    expect(ctx.livingPersona.biofeedbackFilter).toBe(1);
    expect(ctx.livingPersona.vrMatrixInitiative).toBe(3 + 3);
    expect(ctx.livingPersona.vrMatrixInitiativePasses).toBe(2);
  });

  it('resolves sprite affinity categories for the actor stream', async () => {
    const ctx = await buildMatrixContext(makeActorData({ stream: 'DEFAULT' }));
    expect(ctx.spriteAffinityCategories.map((c) => c.key)).toEqual([
      'COURIER',
      'CRACK',
      'DATA',
      'FAULT',
      'MACHINE',
    ]);
  });

  it('lists compiled sprites linked via ownerUuid', async () => {
    globalThis.game.actors = [makeSpriteActor()];
    const ctx = await buildMatrixContext(makeActorData(), 'Actor.owner1');
    expect(ctx.summonedSprites).toHaveLength(1);
    expect(ctx.summonedSprites[0].uuid).toBe('Actor.sprite1');
    expect(ctx.summonedSprites[0].entityType).toBe('sprite');
    expect(ctx.summonedSprites[0].bound).toBe(false);
  });

  it('reports bound sprites as bound', async () => {
    globalThis.game.actors = [
      makeSpriteActor({ system: { ownerUuid: 'Actor.owner1', bound: true } }),
    ];
    const ctx = await buildMatrixContext(makeActorData(), 'Actor.owner1');
    expect(ctx.summonedSprites[0].bound).toBe(true);
  });

  it('excludes sprites the current user lacks permission to observe', async () => {
    globalThis.game.actors = [
      makeSpriteActor({ testUserPermission: () => false }),
    ];
    const ctx = await buildMatrixContext(makeActorData(), 'Actor.owner1');
    expect(ctx.summonedSprites).toEqual([]);
  });
});
