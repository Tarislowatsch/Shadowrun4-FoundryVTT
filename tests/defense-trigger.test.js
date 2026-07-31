import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getValidTargetActorsMock = vi.fn();
const sendCombatSummaryMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    getValidTargetActors: (...args) => getValidTargetActorsMock(...args),
  };
});

vi.mock('@domains/combat/dialogs/defense.js', () => ({
  openDefenseDialog: vi.fn(),
  defaultDefensePool: vi.fn(),
}));

vi.mock('@domains/combat/dialogs/soak.js', () => ({
  openSoakDialog: vi.fn(),
  defaultSoakPool: vi.fn(),
}));

vi.mock('@domains/rigging/index.js', () => ({
  openDroneDefenseDialog: vi.fn(),
}));

vi.mock('../src/domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
    sendDecisionMessage: vi.fn(),
    applyAndSend: vi.fn(),
  },
}));

const { emitDefenseTrigger, emitDefenseTriggerForTarget } = await import(
  '../src/domains/combat/flow/defense-flow.js'
);
const { offSystemSocket, onSystemSocket } = await import(
  '../src/utils/game/system-socket.js'
);
const { resolveFinalSuccessesAndEmit } = await import(
  '../src/utils/rolls/roll-edge-decision.js'
);

const attacker = { uuid: 'Actor.attacker1', name: 'Attacker' };

/** @type {Array<(data: object) => unknown>} */
let handlers;

function makeTarget(id, name) {
  return { uuid: `Actor.${id}`, name, type: 'character' };
}

function makeWeapon() {
  return {
    type: 'weapon',
    name: 'Ares Predator',
    toObject: () => ({ system: { damage: 5, ap: -1 } }),
    system: { damage: 5, ap: -1, damageType: 'PHYSICAL', armorType: 'impact' },
  };
}

function listen(handler) {
  handlers.push(handler);
  onSystemSocket(handler);
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers = [];
  globalThis.game.socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.game.settings = { get: vi.fn().mockReturnValue(false) };
  globalThis.fromUuid = vi.fn(async () => makeTarget('target1', 'Decker'));
  getValidTargetActorsMock.mockReturnValue([]);
});

afterEach(() => {
  for (const handler of handlers) offSystemSocket(handler);
  vi.restoreAllMocks();
});

describe('emitDefenseTrigger — an attack without hits', () => {
  it('reports the miss for every target instead of staying silent', async () => {
    getValidTargetActorsMock.mockReturnValue([
      makeTarget('target1', 'Decker'),
      makeTarget('target2', 'Rigger'),
    ]);
    const triggered = vi.fn();
    listen(triggered);

    await emitDefenseTrigger(attacker, makeWeapon(), 0);

    expect(sendCombatSummaryMock.mock.calls).toEqual([
      ['Attacker', 'Decker', 'missed', {}],
      ['Attacker', 'Rigger', 'missed', {}],
    ]);
    expect(triggered).not.toHaveBeenCalled();
  });

  it('reports the miss even when nothing is targeted', async () => {
    await emitDefenseTrigger(attacker, makeWeapon(), 0);

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Attacker',
      '',
      'missed',
      {}
    );
  });

  it('reports the miss for a single split-pool target', async () => {
    await emitDefenseTriggerForTarget(
      attacker,
      makeWeapon(),
      0,
      'Actor.target1'
    );

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Attacker',
      'Decker',
      'missed',
      {}
    );
  });

  it('reaches the miss report through resolveFinalSuccessesAndEmit', async () => {
    const emit = vi.fn();

    await resolveFinalSuccessesAndEmit(
      attacker,
      { successes: 0, rolledDice: 6, isGlitch: false, edgeUsed: true },
      emit
    );

    expect(emit).toHaveBeenCalledWith(0);
  });

  it('still emits nothing when the roll was cancelled', async () => {
    const emit = vi.fn();

    await resolveFinalSuccessesAndEmit(attacker, null, emit);

    expect(emit).not.toHaveBeenCalled();
  });
});

describe('emitDefenseTrigger — delivery order across targets', () => {
  it('finishes the first defender before triggering the second', async () => {
    getValidTargetActorsMock.mockReturnValue([
      makeTarget('target1', 'Decker'),
      makeTarget('target2', 'Rigger'),
    ]);
    const order = [];
    listen(async (data) => {
      if (data.action !== 'triggerDefense') return;
      const name = data.payload.defenderUuid;
      order.push(`start:${name}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(`end:${name}`);
    });

    await emitDefenseTrigger(attacker, makeWeapon(), 3);

    expect(order).toEqual([
      'start:Actor.target1',
      'end:Actor.target1',
      'start:Actor.target2',
      'end:Actor.target2',
    ]);
  });
});
