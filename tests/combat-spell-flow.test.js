import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deferred } from './helpers/deferred.js';

const awaitOpposedSocketResponseMock = vi.fn();
const openDirectSpellAllocationDialogMock = vi.fn();
const getSpellEffectDataMock = vi.fn();
const sendCombatSummaryMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
    awaitOpposedSocketResponse: (...args) =>
      awaitOpposedSocketResponseMock(...args),
  };
});

vi.mock('@domains/magic/dialogs/combat-spell.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    openDirectSpellAllocationDialog: (...args) =>
      openDirectSpellAllocationDialogMock(...args),
  };
});

vi.mock('../src/domains/magic/flow/apply-effects-flow.js', () => ({
  getSpellEffectData: (...args) => getSpellEffectDataMock(...args),
}));

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
  },
}));

const { CombatSpellFlow } = await import(
  '../src/domains/magic/flow/combat-spell-flow.js'
);

function makeCaster(uuid = 'Actor.caster1') {
  return { uuid, name: 'Caster' };
}

function makeTarget(name = 'Test Target', uuid = 'Actor.target1') {
  return { name, uuid };
}

function makeSpell(damageType, name = 'Test Spell') {
  return {
    name,
    system: { combatType: 'DIRECT', type: 'PHYSICAL', damageType },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn() } };
  globalThis.game.settings = { get: () => true };
  globalThis.game.socket = { emit: vi.fn() };
  awaitOpposedSocketResponseMock.mockResolvedValue(2);
  openDirectSpellAllocationDialogMock.mockResolvedValue(2);
  getSpellEffectDataMock.mockReturnValue([]);
});

describe('CombatSpellFlow direct damage — isPhysical', () => {
  it.each([
    ['PHYSICAL', true],
    ['STUN', false],
    ['ELECTRICITY', false],
    ['STUN_HALF', false],
  ])('%s spell damageType -> isPhysical: %s', async (damageType, expected) => {
    await CombatSpellFlow.resolve(makeCaster(), makeSpell(damageType), 3, [
      { target: makeTarget(), hits: 4 },
    ]);

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'applyDirectSpellDamage',
        payload: expect.objectContaining({ isPhysical: expected }),
      })
    );
  });
});

describe('CombatSpellFlow direct damage — fully resisted', () => {
  beforeEach(() => {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);
  });

  it('reports the resisted spell instead of ending it silently', async () => {
    await CombatSpellFlow.resolve(makeCaster(), makeSpell('PHYSICAL'), 3, [
      { target: makeTarget(), hits: 4 },
    ]);

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Caster',
      'Test Target',
      'spellNoEffect',
      { spell: 'Test Spell' }
    );
  });

  it('neither allocates hits nor emits damage', async () => {
    await CombatSpellFlow.resolve(makeCaster(), makeSpell('PHYSICAL'), 3, [
      { target: makeTarget(), hits: 4 },
    ]);

    expect(openDirectSpellAllocationDialogMock).not.toHaveBeenCalled();
    expect(globalThis.game.socket.emit).not.toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({ action: 'applyDirectSpellDamage' })
    );
  });
});

describe('CombatSpellFlow.resolve per-target direct damage — isPhysical', () => {
  it.each([
    ['PHYSICAL', true],
    ['STUN', false],
    ['ELECTRICITY', false],
    ['STUN_HALF', false],
  ])('%s spell damageType -> isPhysical: %s', async (damageType, expected) => {
    await CombatSpellFlow.resolve(makeCaster(), makeSpell(damageType), 3, [
      { target: makeTarget(), hits: 4 },
    ]);

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'applyDirectSpellDamage',
        payload: expect.objectContaining({ isPhysical: expected }),
      })
    );
  });
});

describe('CombatSpellFlow.resolve — several targets', () => {
  const first = makeTarget('Target A', 'Actor.targetA');
  const second = makeTarget('Target B', 'Actor.targetB');

  it('sends each direct target its own casting hits', async () => {
    await CombatSpellFlow.resolve(makeCaster(), makeSpell('PHYSICAL'), 3, [
      { target: first, hits: 4 },
      { target: second, hits: 2 },
    ]);

    const payloads = awaitOpposedSocketResponseMock.mock.calls.map(
      ([config]) => config.triggerPayload
    );
    expect(payloads).toEqual([
      expect.objectContaining({
        defenderUuid: 'Actor.targetA',
        castingHits: 4,
      }),
      expect.objectContaining({
        defenderUuid: 'Actor.targetB',
        castingHits: 2,
      }),
    ]);
  });

  it('returns the highest applied hits as drain modifier', async () => {
    openDirectSpellAllocationDialogMock
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);

    const { drainModifier } = await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [
        { target: first, hits: 4 },
        { target: second, hits: 4 },
      ]
    );

    expect(drainModifier).toBe(3);
  });

  it('sends each indirect target its own casting hits', async () => {
    const spell = {
      ...makeSpell('PHYSICAL'),
      system: { combatType: 'INDIRECT', type: 'PHYSICAL' },
      toObject: () => ({ name: 'Test Spell' }),
    };

    const { drainModifier } = await CombatSpellFlow.resolve(
      makeCaster(),
      spell,
      3,
      [
        { target: first, hits: 4 },
        { target: second, hits: 2 },
      ]
    );

    const payloads = globalThis.game.socket.emit.mock.calls
      .map(([, data]) => data)
      .filter((data) => data.action === 'triggerIndirectSpellDefense')
      .map((data) => data.payload);
    expect(payloads).toEqual([
      expect.objectContaining({
        defenderUuid: 'Actor.targetA',
        castingHits: 4,
      }),
      expect.objectContaining({
        defenderUuid: 'Actor.targetB',
        castingHits: 2,
      }),
    ]);
    expect(drainModifier).toBe(0);
  });
});

describe('CombatSpellFlow.resolve — direct socket request', () => {
  /**
   * @param {object} [system]
   * @returns {Promise<any>}
   */
  async function resolveAndCapture(system = {}) {
    const spell = makeSpell('PHYSICAL');
    spell.system = { ...spell.system, ...system };
    await CombatSpellFlow.resolve(makeCaster(), spell, 3, [
      { target: makeTarget(), hits: 4 },
    ]);
    return awaitOpposedSocketResponseMock.mock.calls[0][0];
  }

  it('asks the target to resist a physical spell', async () => {
    const config = await resolveAndCapture();

    expect(config).toEqual(
      expect.objectContaining({
        triggerAction: 'triggerDirectSpellResist',
        matchAction: 'directSpellResisted',
        fallback: 0,
        triggerPayload: {
          defenderUuid: 'Actor.target1',
          casterUuid: 'Actor.caster1',
          spellName: 'Test Spell',
          castingHits: 4,
          force: 3,
          isMana: false,
        },
      })
    );
  });

  it('flags mana spells for the resistance test', async () => {
    const config = await resolveAndCapture({ type: 'MANA' });

    expect(config.triggerPayload.isMana).toBe(true);
  });

  it('treats a spell without combat type as direct', async () => {
    const config = await resolveAndCapture({ combatType: undefined });

    expect(config.triggerAction).toBe('triggerDirectSpellResist');
  });

  it('only accepts the answer of this caster and defender', async () => {
    const { matches } = await resolveAndCapture();

    expect(
      matches({ casterUuid: 'Actor.caster1', defenderUuid: 'Actor.target1' })
    ).toBe(true);
    expect(
      matches({ casterUuid: 'Actor.other', defenderUuid: 'Actor.target1' })
    ).toBe(false);
    expect(
      matches({ casterUuid: 'Actor.caster1', defenderUuid: 'Actor.other' })
    ).toBe(false);
    expect(matches(undefined)).toBe(false);
  });

  it.each([
    [1, 3],
    [4, 0],
    [6, 0],
    [null, 0],
  ])(
    'resist hits %s against 4 casting hits -> %i net hits',
    async (resistHits, expected) => {
      const { onMatch } = await resolveAndCapture();

      expect(onMatch({ resistHits })).toBe(expected);
    }
  );
});

describe('CombatSpellFlow.resolve — direct damage', () => {
  it('deals force plus allocated hits with the spell effects', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(3);
    openDirectSpellAllocationDialogMock.mockResolvedValue(2);
    getSpellEffectDataMock.mockReturnValue([{ name: 'Burning' }]);

    const { drainModifier } = await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      5,
      [{ target: makeTarget(), hits: 4 }]
    );

    expect(openDirectSpellAllocationDialogMock).toHaveBeenCalledWith(
      'Test Spell',
      5,
      3,
      'Test Target'
    );
    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'applyDirectSpellDamage',
        payload: {
          defenderUuid: 'Actor.target1',
          casterUuid: 'Actor.caster1',
          spellName: 'Test Spell',
          damage: 7,
          isPhysical: true,
          effects: [{ name: 'Burning' }],
          quiet: false,
        },
      })
    );
    expect(drainModifier).toBe(2);
  });

  it('applies damage with a single net hit', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(1);

    await CombatSpellFlow.resolve(makeCaster(), makeSpell('PHYSICAL'), 3, [
      { target: makeTarget(), hits: 4 },
    ]);

    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
    expect(openDirectSpellAllocationDialogMock).toHaveBeenCalled();
  });

  it('passes an empty name for unnamed targets to the allocation dialog', async () => {
    await CombatSpellFlow.resolve(makeCaster(), makeSpell('PHYSICAL'), 3, [
      { target: { uuid: 'Actor.target1' }, hits: 4 },
    ]);

    expect(openDirectSpellAllocationDialogMock).toHaveBeenCalledWith(
      'Test Spell',
      3,
      2,
      ''
    );
  });

  it.each(['DIRECT', 'INDIRECT'])(
    'skips %s targets without a uuid',
    async (combatType) => {
      const spell = {
        ...makeSpell('PHYSICAL'),
        system: { combatType, type: 'PHYSICAL' },
        toObject: () => ({}),
      };

      await CombatSpellFlow.resolve(makeCaster(), spell, 3, [
        { target: { name: 'Token only' }, hits: 4 },
      ]);

      expect(awaitOpposedSocketResponseMock).not.toHaveBeenCalled();
      expect(globalThis.game.socket.emit).not.toHaveBeenCalled();
    }
  );
});

describe('CombatSpellFlow.resolve — parallel resistance', () => {
  const first = makeTarget('Target A', 'Actor.targetA');
  const second = makeTarget('Target B', 'Actor.targetB');

  it('asks every direct target to resist before allocating any hits', async () => {
    const answers = [deferred(), deferred()];
    awaitOpposedSocketResponseMock
      .mockReturnValueOnce(answers[0].promise)
      .mockReturnValueOnce(answers[1].promise);

    const done = CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [
        { target: first, hits: 4 },
        { target: second, hits: 4 },
      ]
    );
    await Promise.resolve();

    expect(awaitOpposedSocketResponseMock).toHaveBeenCalledTimes(2);
    expect(openDirectSpellAllocationDialogMock).not.toHaveBeenCalled();

    answers[1].resolve(2);
    answers[0].resolve(1);
    await done;

    expect(
      openDirectSpellAllocationDialogMock.mock.calls.map((call) => call[3])
    ).toEqual(['Target A', 'Target B']);
  });

  it('reports only the fully resisting target', async () => {
    const answers = [deferred(), deferred()];
    awaitOpposedSocketResponseMock
      .mockReturnValueOnce(answers[0].promise)
      .mockReturnValueOnce(answers[1].promise);

    const done = CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [
        { target: first, hits: 4 },
        { target: second, hits: 4 },
      ]
    );
    answers[1].resolve(0);
    answers[0].resolve(2);
    await done;

    expect(sendCombatSummaryMock).toHaveBeenCalledTimes(1);
    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Caster',
      'Target B',
      'spellNoEffect',
      { spell: 'Test Spell' }
    );
    expect(openDirectSpellAllocationDialogMock).toHaveBeenCalledTimes(1);
  });
});

describe('CombatSpellFlow.resolve — no targets', () => {
  it('sends no request and adds no drain for an empty target list', async () => {
    const { drainModifier } = await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      []
    );

    expect(awaitOpposedSocketResponseMock).not.toHaveBeenCalled();
    expect(drainModifier).toBe(0);
  });
});

describe('CombatSpellFlow.resolve — outcomes', () => {
  const first = makeTarget('Target A', 'Actor.targetA');
  const second = makeTarget('Target B', 'Actor.targetB');

  it('reports net hits and full resistance per direct target', async () => {
    awaitOpposedSocketResponseMock
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    const { outcomes } = await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [
        { target: first, hits: 4 },
        { target: second, hits: 4 },
      ]
    );

    expect(outcomes).toEqual([
      { target: first, kind: 'affected', hits: 3 },
      { target: second, kind: 'resisted', hits: 0 },
    ]);
  });

  it('reports requested defenses for indirect targets', async () => {
    const spell = {
      ...makeSpell('PHYSICAL'),
      system: { combatType: 'INDIRECT', type: 'PHYSICAL' },
      toObject: () => ({}),
    };

    const { outcomes } = await CombatSpellFlow.resolve(makeCaster(), spell, 3, [
      { target: first, hits: 4 },
      { target: second, hits: 2 },
    ]);

    expect(outcomes).toEqual([
      { target: first, kind: 'defenseRequested', hits: 4 },
      { target: second, kind: 'defenseRequested', hits: 2 },
    ]);
  });

  it('leaves targets without a uuid out of the outcomes', async () => {
    const { outcomes } = await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [{ target: { name: 'Token only' }, hits: 4 }]
    );

    expect(outcomes).toEqual([]);
  });

  it('suppresses the single no-effect message when quiet', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);

    await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [{ target: first, hits: 4 }],
      { quiet: true }
    );

    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
  });
});

describe('CombatSpellFlow.resolve — quiet damage', () => {
  it('asks the defender to skip the hit message when quiet', async () => {
    await CombatSpellFlow.resolve(
      makeCaster(),
      makeSpell('PHYSICAL'),
      3,
      [{ target: makeTarget(), hits: 4 }],
      { quiet: true }
    );

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'applyDirectSpellDamage',
        payload: expect.objectContaining({ quiet: true }),
      })
    );
  });
});
