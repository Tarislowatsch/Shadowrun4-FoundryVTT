import { describe, it, expect, vi } from 'vitest';

const { unlinkFromOwner, findLinkedActors } = await import(
  '@domains/summoned-entity/owner-link.js'
);

describe('unlinkFromOwner', () => {
  it.each(['spirit', 'sprite'])(
    'clears the owner and the bound state of a %s together',
    async (type) => {
      const actor = { type, update: vi.fn() };

      await unlinkFromOwner(actor);

      expect(actor.update).toHaveBeenCalledWith({
        'system.ownerUuid': '',
        'system.bound': false,
      });
    }
  );

  it('clears the rigger of a vehicle and hands it back to its autopilot', async () => {
    const actor = { type: 'vehicle', update: vi.fn() };

    await unlinkFromOwner(actor);

    expect(actor.update).toHaveBeenCalledWith({
      'system.riggerUuid': '',
      'system.controlMode': 'autonomous',
    });
  });
});

describe('findLinkedActors', () => {
  it('finds spirits, sprites and vehicles linked to the owner', () => {
    const spirit = { type: 'spirit', system: { ownerUuid: 'Actor.owner1' } };
    const sprite = { type: 'sprite', system: { ownerUuid: 'Actor.owner1' } };
    const vehicle = { type: 'vehicle', system: { riggerUuid: 'Actor.owner1' } };
    const foreign = { type: 'spirit', system: { ownerUuid: 'Actor.other' } };
    const wrongField = {
      type: 'vehicle',
      system: { ownerUuid: 'Actor.owner1' },
    };
    const character = {
      type: 'character',
      system: { ownerUuid: 'Actor.owner1' },
    };

    const linked = findLinkedActors('Actor.owner1', [
      spirit,
      sprite,
      vehicle,
      foreign,
      wrongField,
      character,
    ]);

    expect(linked).toEqual([spirit, sprite, vehicle]);
  });

  it('finds nothing without an owner uuid', () => {
    const spirit = { type: 'spirit', system: { ownerUuid: '' } };

    expect(findLinkedActors('', [spirit])).toEqual([]);
  });

  it('searches the world actors by default', () => {
    const spirit = { type: 'spirit', system: { ownerUuid: 'Actor.owner1' } };
    globalThis.game.actors = [spirit];

    expect(findLinkedActors('Actor.owner1')).toEqual([spirit]);
  });
});
