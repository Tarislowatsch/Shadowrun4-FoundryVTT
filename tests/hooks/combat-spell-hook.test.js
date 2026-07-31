import { describe, it, expect, vi, beforeEach } from 'vitest';

const isResponsibleForActorMock = vi.fn();
const sendEffectDecisionMessageMock = vi.fn();

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
