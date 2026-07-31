import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const { isResponsibleForActor, isPrimaryGM } = await import(
  '../src/utils/actor-ownership.js'
);

function makeUser({ id, isGM = false, active = true, characterId = null }) {
  return {
    id,
    isGM,
    active,
    character: characterId ? { id: characterId } : null,
  };
}

/** @type {object} */
let savedUser;
/** @type {object} */
let savedUsers;

function setWorld(currentUserId, users) {
  globalThis.game.users = users;
  globalThis.game.user = users.find((u) => u.id === currentUserId);
}

beforeEach(() => {
  savedUser = globalThis.game.user;
  savedUsers = globalThis.game.users;
});

afterEach(() => {
  globalThis.game.user = savedUser;
  globalThis.game.users = savedUsers;
});

describe('isPrimaryGM', () => {
  it('is true only for the first active GM', () => {
    const users = [
      makeUser({ id: 'gm1', isGM: true }),
      makeUser({ id: 'gm2', isGM: true }),
    ];

    setWorld('gm1', users);
    expect(isPrimaryGM()).toBe(true);

    setWorld('gm2', users);
    expect(isPrimaryGM()).toBe(false);
  });

  it('is false for a player', () => {
    setWorld('p1', [makeUser({ id: 'p1' })]);

    expect(isPrimaryGM()).toBe(false);
  });

  it('skips a disconnected GM', () => {
    const users = [
      makeUser({ id: 'gm1', isGM: true, active: false }),
      makeUser({ id: 'gm2', isGM: true }),
    ];

    setWorld('gm2', users);

    expect(isPrimaryGM()).toBe(true);
  });
});

describe('isResponsibleForActor', () => {
  it('lets the assigned player handle their own character', () => {
    setWorld('p1', [makeUser({ id: 'p1', characterId: 'actor1' })]);

    expect(isResponsibleForActor('actor1')).toBe(true);
  });

  it('keeps the GM out while the assigned player is connected', () => {
    setWorld('gm1', [
      makeUser({ id: 'gm1', isGM: true }),
      makeUser({ id: 'p1', characterId: 'actor1' }),
    ]);

    expect(isResponsibleForActor('actor1')).toBe(false);
  });

  it('hands the actor to the GM when the assigned player is offline', () => {
    setWorld('gm1', [
      makeUser({ id: 'gm1', isGM: true }),
      makeUser({ id: 'p1', active: false, characterId: 'actor1' }),
    ]);

    expect(isResponsibleForActor('actor1')).toBe(true);
  });

  it('leaves an unassigned actor to the primary GM only', () => {
    const users = [
      makeUser({ id: 'gm1', isGM: true }),
      makeUser({ id: 'gm2', isGM: true }),
    ];

    setWorld('gm1', users);
    expect(isResponsibleForActor('actor1')).toBe(true);

    setWorld('gm2', users);
    expect(isResponsibleForActor('actor1')).toBe(false);
  });

  it('never makes an unrelated player responsible', () => {
    setWorld('p2', [
      makeUser({ id: 'p1', active: false, characterId: 'actor1' }),
      makeUser({ id: 'p2', characterId: 'actor2' }),
    ]);

    expect(isResponsibleForActor('actor1')).toBe(false);
  });
});
