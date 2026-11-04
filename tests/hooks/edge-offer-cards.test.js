import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@utils/actor-ownership.js', () => ({
  isResponsibleForActor: () => true,
  isPrimaryGM: () => true,
}));

const { appendEdgeButton } = await import('@hooks/edge-offer-cards.js');
const { DiceUtility } = await import('@utils/index');
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
      addEventListener(type, handler) {
        this.onClick = handler;
      },
      remove: () => {},
    }),
  };
  globalThis.game.actors = { get: () => ({ getAttribute: () => 3 }) };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

describe('appendEdgeButton — extended test follow-ups', () => {
  const EXTENDED_PAYLOAD = {
    ...ROLL_PAYLOAD,
    extended: true,
    options: {
      skillName: 'Hardware',
      actor: { _id: 'actor-1', name: 'Stale' },
    },
  };

  /**
   * @returns {{ actor: object, children: object[] }}
   */
  function renderExtendedCard() {
    const actor = { sheetStats: { EDGE: 3 }, useEdge: vi.fn() };
    globalThis.game.actors = { get: () => actor };
    const container = makeContainer();
    appendEdgeButton(makeMessage({ [SYSTEM_ID]: EXTENDED_PAYLOAD }), container);
    return { actor, children: container.children };
  }

  it('passes the live actor document to the extend roll', async () => {
    const followUp = vi.spyOn(DiceUtility, 'followUpRoll').mockResolvedValue(3);
    const { actor, children } = renderExtendedCard();

    await children[0].onClick();

    expect(followUp.mock.calls[0][0].actor).toBe(actor);
    expect(actor.useEdge).not.toHaveBeenCalled();
  });

  it('spends Edge once on the actor document when extending with Edge', async () => {
    const followUp = vi.spyOn(DiceUtility, 'followUpRoll').mockResolvedValue(3);
    const { actor, children } = renderExtendedCard();

    await children[1].onClick();

    expect(actor.useEdge).toHaveBeenCalledOnce();
    expect(followUp.mock.calls[0][0]).toMatchObject({
      actor,
      explode: true,
      numDice: 8,
    });
  });
});
