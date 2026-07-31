import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const awaitOpposedSocketResponseMock = vi.fn();
const getMatrixPersonaMock = vi.fn();
const getOffensiveProgramsMock = vi.fn();
const getValidMatrixTargetActorsOrWarnMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    isResponsibleForActor: () => true,
    awaitOpposedSocketResponse: (...args) =>
      awaitOpposedSocketResponseMock(...args),
    getValidMatrixTargetActorsOrWarn: (...args) =>
      getValidMatrixTargetActorsOrWarnMock(...args),
  };
});

vi.mock('../src/domains/matrix/matrix-persona.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getMatrixPersona: (...args) => getMatrixPersonaMock(...args),
    getOffensivePrograms: (...args) => getOffensiveProgramsMock(...args),
  };
});

vi.mock('../src/domains/matrix/dialogs/cybercombat.js', () => ({
  openCybercombatAttackDialog: vi.fn(),
  openMatrixResistDialog: vi.fn(),
}));

const { CybercombatFlow } = await import(
  '../src/domains/matrix/flow/cybercombat-flow.js'
);
const { MatrixDefenseFlow } = await import(
  '@domains/matrix/flow/defense-flow.js'
);
const { CybercombatHook } = await import('../src/hooks/cybercombat-hook.js');
const { offSystemSocket } = await import('../src/utils/game/system-socket.js');
const { openCybercombatAttackDialog } = await import(
  '../src/domains/matrix/dialogs/cybercombat.js'
);

const attacker = { uuid: 'Actor.attacker1', name: 'Hacker' };
const target = { uuid: 'Actor.target1', name: 'Decker', type: 'character' };

function emittedActions() {
  return globalThis.game.socket.emit.mock.calls.map(
    (call) => call[1]?.action ?? null
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getMatrixPersonaMock.mockReturnValue({ inVR: true, simMode: 'cold' });
  globalThis.game.socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
  awaitOpposedSocketResponseMock.mockResolvedValue(0);
});

describe('CybercombatFlow._attackVsTarget — black IC', () => {
  it('applies the jam before asking for the biofeedback resist', async () => {
    await CybercombatFlow._attackVsTarget(
      attacker,
      target,
      { category: 'blackHammer', rating: 4, name: 'Black Hammer' },
      3
    );

    expect(emittedActions()).toEqual([
      'applyMatrixJam',
      'triggerBiofeedbackResist',
    ]);
  });

  it('asks a plain attack program only for the matrix resist', async () => {
    await CybercombatFlow._attackVsTarget(
      attacker,
      target,
      { category: 'attack', rating: 4, name: 'Attack' },
      3
    );

    expect(emittedActions()).toEqual(['triggerMatrixResist']);
  });
});

describe('CybercombatFlow._attackVsTarget — local delivery on one client', () => {
  /** @type {CybercombatHook} */
  let hook;
  /** @type {string[]} */
  let order;

  beforeEach(() => {
    order = [];
    globalThis.Hooks = { once: (_event, callback) => callback(), on: vi.fn() };
    globalThis.fromUuid = vi.fn().mockResolvedValue(target);
    vi.spyOn(MatrixDefenseFlow, 'handleJam').mockImplementation(async () => {
      order.push('jam:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('jam:end');
    });
    vi.spyOn(MatrixDefenseFlow, 'handleBiofeedbackResist').mockImplementation(
      async () => {
        order.push('biofeedbackResist:start');
      }
    );
    hook = new CybercombatHook();
  });

  afterEach(() => {
    offSystemSocket(hook._boundHandler);
    vi.restoreAllMocks();
  });

  it('finishes the jam before the biofeedback resist starts', async () => {
    await CybercombatFlow._attackVsTarget(
      attacker,
      target,
      { category: 'blackHammer', rating: 4, name: 'Black Hammer' },
      3
    );

    expect(order).toEqual(['jam:start', 'jam:end', 'biofeedbackResist:start']);
  });
});

describe('CybercombatFlow.start — the public entry point', () => {
  const secondTarget = {
    uuid: 'Actor.target2',
    name: 'Rigger',
    type: 'character',
  };
  /** @type {CybercombatHook} */
  let hook;
  /** @type {string[]} */
  let order;

  function record(step) {
    return async (_defender, payload) => {
      order.push(`${step}:${payload.defenderUuid}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    };
  }

  beforeEach(() => {
    order = [];
    globalThis.Hooks = { once: (_event, callback) => callback(), on: vi.fn() };
    globalThis.fromUuid = vi.fn(async (uuid) =>
      uuid === secondTarget.uuid ? secondTarget : target
    );
    globalThis.game.settings = { get: vi.fn().mockReturnValue(true) };
    getOffensiveProgramsMock.mockReturnValue([
      { category: 'blackHammer', rating: 4, name: 'Black Hammer' },
    ]);
    getValidMatrixTargetActorsOrWarnMock.mockReturnValue([
      target,
      secondTarget,
    ]);
    openCybercombatAttackDialog.mockResolvedValue({
      successes: 3,
      rolledDice: 8,
      isGlitch: false,
      edgeUsed: true,
      messageId: null,
      program: { category: 'blackHammer', rating: 4, name: 'Black Hammer' },
    });
    vi.spyOn(MatrixDefenseFlow, 'handleJam').mockImplementation(record('jam'));
    vi.spyOn(MatrixDefenseFlow, 'handleBiofeedbackResist').mockImplementation(
      record('biofeedback')
    );
    hook = new CybercombatHook();
  });

  afterEach(() => {
    offSystemSocket(hook._boundHandler);
    vi.restoreAllMocks();
  });

  it('resolves each target completely before moving to the next', async () => {
    await CybercombatFlow.start(attacker);

    expect(order).toEqual([
      'jam:Actor.target1',
      'biofeedback:Actor.target1',
      'jam:Actor.target2',
      'biofeedback:Actor.target2',
    ]);
  });

  it('stops before any target when the workflow is disabled', async () => {
    globalThis.game.settings.get.mockReturnValue(false);

    await CybercombatFlow.start(attacker);

    expect(openCybercombatAttackDialog).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  it('stops when the attack dialog is cancelled', async () => {
    openCybercombatAttackDialog.mockResolvedValue(null);

    await CybercombatFlow.start(attacker);

    expect(order).toEqual([]);
  });
});
