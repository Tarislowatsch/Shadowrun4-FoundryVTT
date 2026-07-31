import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@utils/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGame: () => globalThis.game,
  };
});

const {
  requestEffectDecision,
  sendEffectDecisionMessage,
  getEffectDecisionEntry,
} = await import('../src/domains/magic/flow/apply-effects-flow.js');

function makeTarget() {
  return { id: 'target1', name: 'Target', uuid: 'Actor.target1' };
}

const effectData = [{ name: 'Stunned' }];

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.game.socket = { emit: vi.fn() };
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
  globalThis.ActiveEffect = { create: vi.fn() };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('requestEffectDecision', () => {
  it('routes the decision over the socket instead of creating the card itself', async () => {
    await requestEffectDecision(makeTarget(), effectData, 'Test Spell');

    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining({
        action: 'triggerSpellEffectDecision',
        payload: {
          defenderUuid: 'Actor.target1',
          effectData,
          spellName: 'Test Spell',
        },
      })
    );
  });

  it('does nothing for a spell without effects', async () => {
    await requestEffectDecision(makeTarget(), [], 'Test Spell');

    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
    expect(globalThis.game.socket.emit).not.toHaveBeenCalled();
  });
});

describe('sendEffectDecisionMessage', () => {
  it('registers the entry locally so the button can render', async () => {
    const target = makeTarget();

    await sendEffectDecisionMessage(target, effectData, 'Test Spell');

    expect(getEffectDecisionEntry('msg1')).toEqual({
      target,
      effectData,
      spellName: 'Test Spell',
    });
  });

  it('applies the effects directly instead of throwing when the card fails', async () => {
    globalThis.ChatMessage.create.mockResolvedValue(undefined);
    const target = makeTarget();

    await sendEffectDecisionMessage(target, effectData, 'Test Spell');

    expect(globalThis.ActiveEffect.create).toHaveBeenCalledWith(effectData[0], {
      parent: target,
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('does not register an entry for a card that never existed', async () => {
    globalThis.ChatMessage.create.mockResolvedValue(undefined);

    await sendEffectDecisionMessage(makeTarget(), effectData, 'Test Spell');

    expect(getEffectDecisionEntry(undefined)).toBeUndefined();
  });
});
