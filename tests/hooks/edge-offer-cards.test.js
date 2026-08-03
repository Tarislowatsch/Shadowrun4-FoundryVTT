import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@utils/actor-ownership.js', () => ({
  isResponsibleForActor: () => true,
  isPrimaryGM: () => true,
}));

const { appendEdgeButton } = await import('@hooks/edge-offer-cards.js');
const { SYSTEM_ID } = await import('../../src/utils/game/system-id.js');
const { withFlagApi } = await import('../helpers/foundry-document.js');
const { LEGACY_FLAG_SCOPE } = await import(
  '../../src/effects/flag-namespace.js'
);

const ROLL_PAYLOAD = {
  actorId: 'actor-1',
  edgeAvailable: true,
  extended: false,
  reroll: false,
  isCriticalGlitch: false,
  isGlitch: false,
  successes: 2,
  rolledDice: 6,
  options: {},
};

function makeContainer() {
  const children = [];
  return {
    children,
    appendChild: (child) => children.push(child),
    querySelector: () => null,
  };
}

/**
 * @param {Record<string, unknown>} flags
 * @returns {object}
 */
function makeMessage(flags) {
  return withFlagApi({ id: 'msg-1', flags });
}

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.document = {
    createElement: () => ({
      className: '',
      textContent: '',
      addEventListener: () => {},
      remove: () => {},
    }),
  };
  globalThis.game.actors = { get: () => ({ getAttribute: () => 3 }) };
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.document;
  delete globalThis.game.actors;
});

describe('appendEdgeButton — whole-scope read', () => {
  it('offers Edge for a payload stored under the system scope', () => {
    const container = makeContainer();

    appendEdgeButton(makeMessage({ [SYSTEM_ID]: ROLL_PAYLOAD }), container);

    expect(container.children).toHaveLength(1);
  });

  it('offers nothing when the scope is empty', () => {
    const container = makeContainer();

    appendEdgeButton(makeMessage({}), container);

    expect(container.children).toHaveLength(0);
  });

  it('offers nothing when the payload never left the legacy scope', () => {
    const container = makeContainer();

    appendEdgeButton(
      makeMessage({ [LEGACY_FLAG_SCOPE]: ROLL_PAYLOAD }),
      container
    );

    expect(container.children).toHaveLength(0);
  });
});
