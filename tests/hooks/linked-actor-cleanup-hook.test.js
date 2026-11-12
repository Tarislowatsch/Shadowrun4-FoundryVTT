import { describe, it, expect, beforeEach } from 'vitest';
import { LinkedActorCleanupHook } from '../../src/hooks/linked-actor-cleanup-hook.js';

let deleteActorHandler;

beforeEach(() => {
  deleteActorHandler = undefined;
  globalThis.Hooks = {
    on: (event, handler) => {
      if (event === 'deleteActor') deleteActorHandler = handler;
    },
  };
  globalThis.game.user = { id: 'gm1', isGM: true };
  globalThis.game.users = [{ id: 'gm1', isGM: true, active: true }];
  globalThis.game.actors = [];
});

function makeLinkedActor(overrides = {}) {
  const calls = [];
  return {
    type: 'spirit',
    system: { ownerUuid: 'Actor.parent1' },
    update: async (data) => {
      calls.push(data);
    },
    updateCalls: calls,
    ...overrides,
  };
}

describe('LinkedActorCleanupHook', () => {
  it('registers a deleteActor hook on construction', () => {
    new LinkedActorCleanupHook();
    expect(deleteActorHandler).toBeInstanceOf(Function);
  });

  it.each([
    [
      'spirit',
      { ownerUuid: 'Actor.parent1', bound: true },
      { 'system.ownerUuid': '', 'system.bound': false },
    ],
    [
      'sprite',
      { ownerUuid: 'Actor.parent1', bound: true },
      { 'system.ownerUuid': '', 'system.bound': false },
    ],
    [
      'vehicle',
      { riggerUuid: 'Actor.parent1' },
      { 'system.riggerUuid': '', 'system.controlMode': 'autonomous' },
    ],
  ])(
    'unlinks a %s pointing at the deleted actor',
    async (type, system, expectedUpdate) => {
      const actor = makeLinkedActor({ type, system });
      globalThis.game.actors = [actor];
      new LinkedActorCleanupHook();

      await deleteActorHandler({ uuid: 'Actor.parent1' });

      expect(actor.updateCalls).toEqual([expectedUpdate]);
    }
  );

  it('leaves actors linked to a different owner untouched', async () => {
    const spirit = makeLinkedActor({
      system: { ownerUuid: 'Actor.someoneElse' },
    });
    globalThis.game.actors = [spirit];
    new LinkedActorCleanupHook();

    await deleteActorHandler({ uuid: 'Actor.parent1' });

    expect(spirit.updateCalls).toEqual([]);
  });

  it('does nothing when the current user is not the primary GM', async () => {
    const spirit = makeLinkedActor();
    globalThis.game.actors = [spirit];
    globalThis.game.user = { id: 'player1', isGM: false };
    new LinkedActorCleanupHook();

    await deleteActorHandler({ uuid: 'Actor.parent1' });

    expect(spirit.updateCalls).toEqual([]);
  });
});
