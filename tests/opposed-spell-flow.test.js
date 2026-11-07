import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deferred } from './helpers/deferred.js';

const awaitOpposedSocketResponseMock = vi.fn();
const requestEffectDecisionMock = vi.fn();
const sendCombatSummaryMock = vi.fn();
const getSpellEffectDataMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    awaitOpposedSocketResponse: (...args) =>
      awaitOpposedSocketResponseMock(...args),
  };
});

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
  },
}));

vi.mock('../src/domains/magic/flow/apply-effects-flow.js', () => ({
  getSpellEffectData: (...args) => getSpellEffectDataMock(...args),
  requestEffectDecision: (...args) => requestEffectDecisionMock(...args),
}));

const { OpposedSpellFlow } = await import(
  '../src/domains/magic/flow/opposed-spell-flow.js'
);

const caster = { uuid: 'Actor.caster1', name: 'Caster' };
const target = { uuid: 'Actor.target1', name: 'Target' };
const spell = {
  name: 'Confusion',
  system: { category: 'ILLUSION', type: 'MANA' },
};
const effectData = [{ name: 'Confused' }];

beforeEach(() => {
  vi.clearAllMocks();
  getSpellEffectDataMock.mockReturnValue([{ name: 'Confused' }]);
});

describe('OpposedSpellFlow.resolve', () => {
  it('reports the fully resisted spell instead of ending it silently', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);

    await OpposedSpellFlow.resolve(caster, spell, 4, [{ target, hits: 3 }]);

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Caster',
      'Target',
      'spellNoEffect',
      { spell: 'Confusion' }
    );
    expect(requestEffectDecisionMock).not.toHaveBeenCalled();
  });

  it('routes the effects to the target when net hits remain', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(2);

    await OpposedSpellFlow.resolve(caster, spell, 4, [{ target, hits: 3 }]);

    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      target,
      effectData,
      'Confusion'
    );
    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
  });
});

describe('OpposedSpellFlow.resolve — casting hits', () => {
  it('sends each target its own casting hits', async () => {
    const other = { uuid: 'Actor.target2', name: 'Other' };
    awaitOpposedSocketResponseMock.mockResolvedValue(0);

    await OpposedSpellFlow.resolve(caster, spell, 4, [
      { target, hits: 3 },
      { target: other, hits: 1 },
    ]);

    const payloads = awaitOpposedSocketResponseMock.mock.calls.map(
      ([config]) => config.triggerPayload
    );
    expect(payloads).toEqual([
      expect.objectContaining({
        defenderUuid: 'Actor.target1',
        castingHits: 3,
      }),
      expect.objectContaining({
        defenderUuid: 'Actor.target2',
        castingHits: 1,
      }),
    ]);
  });
});

describe('OpposedSpellFlow.getResistAttribute', () => {
  it.each([
    ['ILLUSION', 'PHYSICAL', 'INTUITION'],
    ['ILLUSION', 'MANA', 'WILLPOWER'],
    ['HEALTH', 'MANA', 'BODY'],
    ['HEALTH', 'PHYSICAL', 'BODY'],
    ['MANIPULATION', 'PHYSICAL', 'WILLPOWER'],
    ['DETECTION', 'MANA', 'WILLPOWER'],
  ])('%s / %s -> %s', (category, type, expected) => {
    expect(
      OpposedSpellFlow.getResistAttribute({ system: { category, type } })
    ).toBe(expected);
  });

  it('treats a spell without category and type as resisted by Willpower', () => {
    expect(OpposedSpellFlow.getResistAttribute({ system: {} })).toBe(
      'WILLPOWER'
    );
    expect(OpposedSpellFlow.getResistAttribute({})).toBe('WILLPOWER');
  });

  it('defaults a missing spell type to physical', () => {
    expect(
      OpposedSpellFlow.getResistAttribute({ system: { category: 'ILLUSION' } })
    ).toBe('INTUITION');
  });
});

describe('OpposedSpellFlow.resolve — socket request', () => {
  /** @returns {any} */
  async function resolveAndCapture() {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);
    await OpposedSpellFlow.resolve(caster, spell, 4, [{ target, hits: 3 }]);
    return awaitOpposedSocketResponseMock.mock.calls[0][0];
  }

  it('asks the target to resist with the matching attribute', async () => {
    const config = await resolveAndCapture();

    expect(config).toEqual(
      expect.objectContaining({
        triggerAction: 'triggerOpposedSpellResist',
        matchAction: 'opposedSpellResisted',
        fallback: 0,
        triggerPayload: {
          defenderUuid: 'Actor.target1',
          casterUuid: 'Actor.caster1',
          spellName: 'Confusion',
          castingHits: 3,
          force: 4,
          resistAttribute: 'WILLPOWER',
        },
      })
    );
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
    [1, 2],
    [3, 0],
    [5, 0],
    [null, 0],
  ])(
    'resist hits %s against 3 casting hits -> %i net hits',
    async (resistHits, expected) => {
      const { onMatch } = await resolveAndCapture();

      expect(onMatch({ resistHits })).toBe(expected);
    }
  );
});

describe('OpposedSpellFlow.resolve — effects', () => {
  it('applies the effects with a single net hit', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(1);

    await OpposedSpellFlow.resolve(caster, spell, 4, [{ target, hits: 3 }]);

    expect(requestEffectDecisionMock).toHaveBeenCalledTimes(1);
  });

  it('requests no decision for a spell without effects', async () => {
    getSpellEffectDataMock.mockReturnValue([]);
    awaitOpposedSocketResponseMock.mockResolvedValue(2);

    await OpposedSpellFlow.resolve(caster, spell, 4, [{ target, hits: 3 }]);

    expect(requestEffectDecisionMock).not.toHaveBeenCalled();
    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
  });

  it('skips targets without a uuid', async () => {
    await OpposedSpellFlow.resolve(caster, spell, 4, [
      { target: { name: 'Token only' }, hits: 3 },
    ]);

    expect(awaitOpposedSocketResponseMock).not.toHaveBeenCalled();
  });
});

describe('OpposedSpellFlow.resolve — parallel resistance', () => {
  it('asks every target to resist before applying any effect', async () => {
    const other = { uuid: 'Actor.target2', name: 'Other' };
    const answers = [deferred(), deferred()];
    awaitOpposedSocketResponseMock
      .mockReturnValueOnce(answers[0].promise)
      .mockReturnValueOnce(answers[1].promise);

    const done = OpposedSpellFlow.resolve(caster, spell, 4, [
      { target, hits: 3 },
      { target: other, hits: 3 },
    ]);
    await Promise.resolve();

    expect(awaitOpposedSocketResponseMock).toHaveBeenCalledTimes(2);
    expect(requestEffectDecisionMock).not.toHaveBeenCalled();

    answers[1].resolve(2);
    answers[0].resolve(1);
    await done;

    expect(requestEffectDecisionMock.mock.calls.map((call) => call[0])).toEqual(
      [target, other]
    );
  });
});

describe('OpposedSpellFlow.resolve — no targets', () => {
  it('sends no request for an empty target list', async () => {
    await OpposedSpellFlow.resolve(caster, spell, 4, []);

    expect(awaitOpposedSocketResponseMock).not.toHaveBeenCalled();
    expect(requestEffectDecisionMock).not.toHaveBeenCalled();
  });
});

describe('OpposedSpellFlow.resolve — outcomes', () => {
  const other = { uuid: 'Actor.target2', name: 'Other' };

  it('reports net hits and full resistance per target', async () => {
    awaitOpposedSocketResponseMock
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const outcomes = await OpposedSpellFlow.resolve(caster, spell, 4, [
      { target, hits: 3 },
      { target: other, hits: 3 },
    ]);

    expect(outcomes).toEqual([
      { target, kind: 'affected', hits: 2 },
      { target: other, kind: 'resisted', hits: 0 },
    ]);
  });

  it('suppresses the single no-effect message when quiet', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);

    await OpposedSpellFlow.resolve(caster, spell, 4, [{ target, hits: 3 }], {
      quiet: true,
    });

    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
  });
});
