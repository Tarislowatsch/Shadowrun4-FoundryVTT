import { describe, it, expect, vi, beforeEach } from 'vitest';

const awaitOpposedSocketResponseMock = vi.fn();
const getValidTargetActorsOrWarnMock = vi.fn();
const requestEffectDecisionMock = vi.fn();
const sendCombatSummaryMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getValidTargetActorsOrWarn: (...args) =>
      getValidTargetActorsOrWarnMock(...args),
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
  getSpellEffectData: () => [{ name: 'Confused' }],
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
  getValidTargetActorsOrWarnMock.mockReturnValue([target]);
});

describe('OpposedSpellFlow.opposedVsTarget', () => {
  it('reports the fully resisted spell instead of ending it silently', async () => {
    awaitOpposedSocketResponseMock.mockResolvedValue(0);

    await OpposedSpellFlow.start(caster, spell, 3, 4);

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

    await OpposedSpellFlow.start(caster, spell, 3, 4);

    expect(requestEffectDecisionMock).toHaveBeenCalledWith(
      target,
      effectData,
      'Confusion'
    );
    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
  });
});
