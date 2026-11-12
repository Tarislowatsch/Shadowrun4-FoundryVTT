import { describe, it, expect, beforeEach } from 'vitest';
import { getLinkedActors } from '../src/sheets/characters/actor-context.js';

function makeActor({ id, isOwner }) {
  return {
    uuid: `Actor.${id}`,
    img: '',
    name: id,
    type: 'spirit',
    isOwner,
    system: { ownerUuid: 'Actor.owner1', bound: false },
    testUserPermission: () => true,
  };
}

beforeEach(() => {
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 } };
});

describe('getLinkedActors', () => {
  it('tells the card whether the user may change the linked actor', () => {
    globalThis.game.actors = [
      makeActor({ id: 'owned', isOwner: true }),
      makeActor({ id: 'observed', isOwner: false }),
    ];

    const cards = getLinkedActors('Actor.owner1', 'spirit', () => []);

    expect(cards.map(({ name, isOwner }) => ({ name, isOwner }))).toEqual([
      { name: 'owned', isOwner: true },
      { name: 'observed', isOwner: false },
    ]);
  });
});
