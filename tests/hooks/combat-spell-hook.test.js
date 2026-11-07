import { describe, it, expect, vi, beforeEach } from 'vitest';

const isResponsibleForActorMock = vi.fn();
const sendEffectDecisionMessageMock = vi.fn();
const sendCombatSummaryMock = vi.fn();
const sendDecisionMessageMock = vi.fn();

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isResponsibleForActor: (...args) => isResponsibleForActorMock(...args),
  };
});

vi.mock('@domains/magic/flow/apply-effects-flow.js', () => ({
  sendEffectDecisionMessage: (...args) =>
    sendEffectDecisionMessageMock(...args),
}));

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
    sendDecisionMessage: (...args) => sendDecisionMessageMock(...args),
  },
}));

vi.mock('@domains/magic/dialogs/index.js', () => ({
  openDirectSpellResistDialog: vi.fn(),
  openIndirectSpellDefenseDialog: vi.fn(),
  openOpposedSpellResistDialog: vi.fn(),
}));

const { CombatSpellHook } = await import(
  '../../src/hooks/combat-spell-hook.js'
);

const defender = { id: 'defender1', name: 'Defender' };

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.Hooks = { once: vi.fn() };
  globalThis.fromUuid = vi.fn().mockResolvedValue(defender);
  isResponsibleForActorMock.mockReturnValue(true);
});

function makePayload() {
  return {
    defenderUuid: 'Actor.defender1',
    effectData: [{ name: 'Stunned' }],
    spellName: 'Test Spell',
  };
}

describe('CombatSpellHook — triggerSpellEffectDecision', () => {
  it('creates the effect card on the client responsible for the target', async () => {
    const hook = new CombatSpellHook();
    const payload = makePayload();

    await hook._onSocketMessage({
      action: 'triggerSpellEffectDecision',
      payload,
    });

    expect(sendEffectDecisionMessageMock).toHaveBeenCalledWith(
      defender,
      payload.effectData,
      'Test Spell'
    );
  });

  it('ignores the message on a client that is not responsible', async () => {
    isResponsibleForActorMock.mockReturnValue(false);
    const hook = new CombatSpellHook();

    await hook._onSocketMessage({
      action: 'triggerSpellEffectDecision',
      payload: makePayload(),
    });

    expect(sendEffectDecisionMessageMock).not.toHaveBeenCalled();
  });

  it('ignores the message when the target actor cannot be resolved', async () => {
    globalThis.fromUuid = vi.fn().mockResolvedValue(null);
    const hook = new CombatSpellHook();

    await hook._onSocketMessage({
      action: 'triggerSpellEffectDecision',
      payload: makePayload(),
    });

    expect(sendEffectDecisionMessageMock).not.toHaveBeenCalled();
  });

  it('ignores unrelated socket actions', async () => {
    const hook = new CombatSpellHook();

    await hook._onSocketMessage({
      action: 'someOtherAction',
      payload: makePayload(),
    });

    expect(sendEffectDecisionMessageMock).not.toHaveBeenCalled();
  });
});

describe('CombatSpellHook — applyDirectSpellDamage', () => {
  const caster = { name: 'Caster' };

  function damagePayload(extra = {}) {
    return {
      defenderUuid: 'Actor.defender1',
      casterUuid: 'Actor.caster1',
      spellName: 'Manaball',
      damage: 6,
      isPhysical: false,
      effects: [],
      ...extra,
    };
  }

  beforeEach(() => {
    globalThis.fromUuid = vi.fn(async (uuid) =>
      uuid === 'Actor.caster1' ? caster : defender
    );
  });

  it('reports the hit and offers the damage decision', async () => {
    await new CombatSpellHook()._onSocketMessage({
      action: 'applyDirectSpellDamage',
      payload: damagePayload(),
    });

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Caster',
      'Defender',
      'directSpell',
      { spell: 'Manaball', damage: 6, isPhysical: false }
    );
    expect(sendDecisionMessageMock).toHaveBeenCalled();
  });

  it('offers the damage as a spell damage decision', async () => {
    await new CombatSpellHook()._onSocketMessage({
      action: 'applyDirectSpellDamage',
      payload: damagePayload({ isPhysical: true }),
    });

    expect(sendDecisionMessageMock).toHaveBeenCalledWith(
      defender,
      6,
      true,
      'spell'
    );
  });

  it('names an unknown caster with a placeholder', async () => {
    globalThis.fromUuid = vi.fn(async (uuid) =>
      uuid === 'Actor.caster1' ? null : defender
    );

    await new CombatSpellHook()._onSocketMessage({
      action: 'applyDirectSpellDamage',
      payload: damagePayload(),
    });

    expect(sendCombatSummaryMock.mock.calls[0][0]).toBe('?');
  });

  it('offers the spell effects to the defender', async () => {
    await new CombatSpellHook()._onSocketMessage({
      action: 'applyDirectSpellDamage',
      payload: damagePayload({ effects: [{ name: 'Stunned' }] }),
    });

    expect(sendEffectDecisionMessageMock).toHaveBeenCalledWith(
      defender,
      [{ name: 'Stunned' }],
      'Manaball'
    );
  });

  it.each([[[]], [undefined]])(
    'offers no effect decision for %o effects',
    async (effects) => {
      await new CombatSpellHook()._onSocketMessage({
        action: 'applyDirectSpellDamage',
        payload: damagePayload({ effects }),
      });

      expect(sendEffectDecisionMessageMock).not.toHaveBeenCalled();
    }
  );

  it('leaves the hit to the summary card when quiet', async () => {
    await new CombatSpellHook()._onSocketMessage({
      action: 'applyDirectSpellDamage',
      payload: damagePayload({ quiet: true }),
    });

    expect(sendCombatSummaryMock).not.toHaveBeenCalled();
    expect(sendDecisionMessageMock).toHaveBeenCalled();
  });
});
