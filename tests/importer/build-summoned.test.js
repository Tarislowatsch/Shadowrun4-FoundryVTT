import { describe, it, expect, beforeEach } from 'vitest';
import { buildSummonedActorData } from '@importer/build-summoned.js';

beforeEach(() => {
  globalThis.game.items = [];
  globalThis.game.settings = { get: () => '' };
  globalThis.game.packs = { get: () => undefined };
});

describe('buildSummonedActorData', () => {
  it('builds a spirit when type is not "sprite"', async () => {
    const data = await buildSummonedActorData(
      { type: 'spirit', name: 'Fire Spirit', force: '3', services: '2' },
      'Actor.owner1'
    );
    expect(data.type).toBe('spirit');
    expect(data.name).toBe('Fire Spirit');
    expect(data.system.force).toBe(3);
    expect(data.system.spiritType).toBe('Fire Spirit');
    expect(data.system.services).toBe(2);
    expect(data.system.ownerUuid).toBe('Actor.owner1');
  });

  it('builds a sprite when type is "sprite" (case-insensitive)', async () => {
    const data = await buildSummonedActorData(
      { type: 'Sprite', name: 'Courier', force: '4', services: '1' },
      'Actor.owner1'
    );
    expect(data.type).toBe('sprite');
    expect(data.system.rating).toBe(4);
    expect(data.system.spriteType).toBe('Courier');
    expect(data.system.tasks).toBe(1);
  });

  it('prefers crittername over name for the display name', async () => {
    const data = await buildSummonedActorData(
      { type: 'spirit', crittername: 'Grumpy', name: 'Fire Spirit' },
      'Actor.owner1'
    );
    expect(data.name).toBe('Grumpy');
  });

  it('falls back to "Unnamed" when neither crittername nor name is set', async () => {
    const data = await buildSummonedActorData(
      { type: 'spirit' },
      'Actor.owner1'
    );
    expect(data.name).toBe('Unnamed');
  });

  it('defaults force to 1 when missing', async () => {
    const missing = await buildSummonedActorData(
      { type: 'spirit' },
      'Actor.owner1'
    );
    expect(missing.system.force).toBe(1);
    expect(missing.system.sheetStats.BODY).toBe(1);
    expect(missing.system.sheetStats.INITIATIVE).toBe(2);
  });

  it('does not mask an explicit force of 0', async () => {
    const zero = await buildSummonedActorData(
      { type: 'spirit', force: '0' },
      'Actor.owner1'
    );
    expect(zero.system.force).toBe(0);
    expect(zero.system.sheetStats.BODY).toBe(0);
    expect(zero.system.sheetStats.INITIATIVE).toBe(0);
  });

  it('always sets ESSENCE to 6 regardless of force', async () => {
    const data = await buildSummonedActorData(
      { type: 'spirit', force: '5' },
      'Actor.owner1'
    );
    expect(data.system.sheetStats.ESSENCE).toBe(6);
    expect(data.system.sheetStats.CURRENTEDGE).toBe(
      data.system.sheetStats.EDGE
    );
  });

  it('builds from a matching world CritterTemplate instead of flat stats', async () => {
    globalThis.game.items = [
      {
        type: 'CritterTemplate',
        name: 'Wassergeist',
        img: 'icons/spirit.webp',
        system: {
          actorType: 'spirit',
          category: 'Spirits',
          attributes: {
            body: { value: 0, formula: 'F' },
            agility: { value: 0, formula: 'F' },
            reaction: { value: 0, formula: 'F' },
            strength: { value: 0, formula: 'F' },
            charisma: { value: 0, formula: 'F' },
            intuition: { value: 0, formula: 'F' },
            logic: { value: 0, formula: 'F' },
            willpower: { value: 0, formula: 'F' },
            edge: { value: 0, formula: 'F' },
            magic: { value: 0, formula: '0' },
            resonance: { value: 0, formula: '0' },
          },
          powers: ['Materialization'],
        },
      },
    ];

    const data = await buildSummonedActorData(
      { type: 'spirit', name: 'Wassergeist', force: '5', services: '3' },
      'Actor.owner1'
    );
    expect(data.name).toBe('Wassergeist');
    expect(data.img).toBe('icons/spirit.webp');
    expect(data.system.sheetStats.BODY).toBe(5);
    expect(data.system.services).toBe(3);
    expect(data.system.ownerUuid).toBe('Actor.owner1');
    expect(data.items.map((i) => i.name)).toEqual(['Materialization']);
  });

  it('falls back to the configured compendium when no world item matches', async () => {
    globalThis.game.settings = { get: () => 'world.spirits' };
    globalThis.game.packs = {
      get: () => ({
        getDocuments: async () => [
          {
            name: 'Courier',
            img: 'icons/sprite.webp',
            system: {
              actorType: 'sprite',
              category: 'Sprites',
              attributes: {},
              complexForms: ['Diagnostics'],
            },
          },
        ],
      }),
    };

    const data = await buildSummonedActorData(
      { type: 'sprite', name: 'Courier', force: '4', services: '1' },
      'Actor.owner1'
    );
    expect(data.img).toBe('icons/sprite.webp');
    expect(data.system.tasks).toBe(1);
    expect(data.items.map((i) => i.name)).toEqual(['Diagnostics']);
  });

  it('prefers a world item over a same-named compendium entry', async () => {
    globalThis.game.items = [
      {
        type: 'CritterTemplate',
        name: 'Fire Spirit',
        img: 'world/fire-spirit.webp',
        system: { actorType: 'spirit', category: 'Spirits', attributes: {} },
      },
    ];
    globalThis.game.settings = { get: () => 'world.spirits' };
    globalThis.game.packs = {
      get: () => ({
        getDocuments: async () => [
          {
            name: 'Fire Spirit',
            img: 'compendium/fire-spirit.webp',
            system: {
              actorType: 'spirit',
              category: 'Spirits',
              attributes: {},
            },
          },
        ],
      }),
    };

    const data = await buildSummonedActorData(
      { type: 'spirit', name: 'Fire Spirit', force: '2', services: '0' },
      'Actor.owner1'
    );
    expect(data.img).toBe('world/fire-spirit.webp');
  });
});
