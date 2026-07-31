import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMatrixPersonaMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getGame: () => globalThis.game };
});

vi.mock('../src/domains/matrix/matrix-persona.js', () => ({
  getMatrixPersona: (...args) => getMatrixPersonaMock(...args),
}));

const { MatrixDamageFlow } = await import(
  '../src/domains/matrix/flow/matrix-damage-flow.js'
);

function makeActor(value, max) {
  return {
    id: 'actor1',
    name: 'Decker',
    uuid: 'Actor.actor1',
    system: { conditionMonitor: { matrix: { value, max } } },
    update: vi.fn().mockResolvedValue(undefined),
  };
}

function contents() {
  return globalThis.ChatMessage.create.mock.calls.map(
    (call) => call[0].content
  );
}

const resisted = 'sr4.matrix.damage.resisted:{"name":"Decker"}';
const crashed = 'sr4.matrix.damage.crashed:{"name":"Decker"}';
const damaged = (amount) =>
  `sr4.matrix.damage.summary:{"name":"Decker","amount":${amount},"reason":"sr4.matrix.damage.reason.cybercombat"}`;

function persona(overrides = {}) {
  return {
    inVR: true,
    isDevice: false,
    isSprite: false,
    isTechnomancer: false,
    ...overrides,
  };
}

function makeStunActor(stunValue, stunMax) {
  const actor = {
    id: 'actor1',
    name: 'Decker',
    uuid: 'Actor.actor1',
    system: {
      conditionMonitor: {
        stun: { value: stunValue, max: stunMax },
        physical: { value: 0, max: 10 },
      },
      derivedStats: { overflow: 4 },
    },
  };
  actor.update = vi.fn(async (data) => {
    const monitor = data['system.conditionMonitor'];
    if (monitor) actor.system.conditionMonitor = monitor;
  });
  return actor;
}

function emittedActions() {
  return globalThis.game.socket.emit.mock.calls.map((call) => call[1]?.action);
}

beforeEach(() => {
  vi.clearAllMocks();
  getMatrixPersonaMock.mockReturnValue(persona());
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
  globalThis.game.socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
});

describe('MatrixDamageFlow.apply', () => {
  it('reports the fully resisted attack without touching the monitor', async () => {
    const actor = makeActor(2, 10);

    await MatrixDamageFlow.apply(0, actor, 'cybercombat');

    expect(actor.update).not.toHaveBeenCalled();
    expect(contents()).toEqual([resisted]);
  });

  it('writes the damage to the monitor without crashing', async () => {
    const actor = makeActor(2, 10);

    await MatrixDamageFlow.apply(3, actor, 'cybercombat');

    expect(actor.update).toHaveBeenCalledWith({
      'system.conditionMonitor.matrix.value': 5,
    });
    expect(contents()).toEqual([damaged(3)]);
    expect(emittedActions()).toEqual([]);
  });

  it('crashes the persona when the damage fills the monitor', async () => {
    const actor = makeActor(8, 10);

    await MatrixDamageFlow.apply(4, actor, 'cybercombat');

    expect(contents()).toEqual([damaged(4), crashed]);
    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({ action: 'triggerDumpshock' })
    );
  });

  it('crashes an AR persona without dumpshock', async () => {
    getMatrixPersonaMock.mockReturnValue(persona({ inVR: false }));
    const actor = makeActor(8, 10);

    await MatrixDamageFlow.apply(4, actor, 'cybercombat');

    expect(contents()).toEqual([damaged(4), crashed]);
    expect(emittedActions()).toEqual([]);
    expect(actor.update).toHaveBeenCalledTimes(1);
  });

  it('crashes a device without dumpshock or a realm change', async () => {
    getMatrixPersonaMock.mockReturnValue(persona({ isDevice: true }));
    const actor = makeActor(8, 10);

    await MatrixDamageFlow.apply(4, actor, 'cybercombat');

    expect(contents()).toEqual([damaged(4), crashed]);
    expect(emittedActions()).toEqual([]);
    expect(actor.update).toHaveBeenCalledTimes(1);
  });

  it('clamps the monitor at its maximum', async () => {
    const actor = makeActor(8, 10);

    await MatrixDamageFlow.apply(5, actor, 'cybercombat');

    expect(actor.update).toHaveBeenCalledWith({
      'system.conditionMonitor.matrix.value': 10,
    });
    expect(contents()).toEqual([damaged(5), crashed]);
  });

  it.each([
    ['a fully resisted attack', 0, [resisted]],
    ['another attack that lands', 3, [damaged(3)]],
  ])(
    'does not crash an already crashed persona again on %s',
    async (_label, amount, expected) => {
      const actor = makeActor(10, 10);

      await MatrixDamageFlow.apply(amount, actor, 'cybercombat');

      expect(contents()).toEqual(expected);
      expect(actor.update).not.toHaveBeenCalled();
      expect(globalThis.game.socket.emit).not.toHaveBeenCalled();
    }
  );
});

describe('MatrixDamageFlow.apply — personas without a matrix monitor', () => {
  it.each([
    ['a sprite', { isSprite: true }],
    ['a technomancer', { isTechnomancer: true }],
  ])('routes %s to the stun monitor', async (_label, flags) => {
    getMatrixPersonaMock.mockReturnValue(persona(flags));
    const actor = makeStunActor(0, 10);

    await MatrixDamageFlow.apply(3, actor, 'cybercombat');

    expect(actor.update).toHaveBeenCalledWith({
      'system.conditionMonitor': expect.objectContaining({
        stun: expect.objectContaining({ value: 3 }),
      }),
    });
    expect(emittedActions()).toEqual([]);
  });

  it('crashes a technomancer whose stun monitor fills up', async () => {
    getMatrixPersonaMock.mockReturnValue(persona({ isTechnomancer: true }));
    const actor = makeStunActor(8, 10);

    await MatrixDamageFlow.apply(2, actor, 'cybercombat');

    expect(contents()).toContain(crashed);
    expect(emittedActions()).toEqual(['triggerDumpshock']);
  });
});
