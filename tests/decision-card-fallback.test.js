import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@domains/matrix/matrix-persona.js', () => ({
  getMatrixPersona: () => ({ isSprite: false, isTechnomancer: false }),
}));

const { ApplyDamageFlow } = await import(
  '@domains/combat/flow/apply-damage-flow.js'
);
const { MatrixDamageFlow } = await import(
  '@domains/matrix/flow/matrix-damage-flow.js'
);

function makeActor() {
  return { id: 'actor1', name: 'Runner', update: vi.fn() };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  globalThis.game.settings = { get: () => true };
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ApplyDamageFlow.sendDecisionMessage — card cannot be created', () => {
  it('applies the damage directly instead of losing it', async () => {
    globalThis.ChatMessage.create.mockResolvedValue(undefined);
    const applySpy = vi
      .spyOn(ApplyDamageFlow, 'applyAndSend')
      .mockResolvedValue(undefined);
    const actor = makeActor();
    const onApply = vi.fn();

    const result = await ApplyDamageFlow.sendDecisionMessage(
      actor,
      5,
      true,
      'combat',
      { onApply }
    );

    expect(applySpy).toHaveBeenCalledWith(5, true, actor, 'combat', onApply);
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('does not fall back while the card is created normally', async () => {
    const applySpy = vi
      .spyOn(ApplyDamageFlow, 'applyAndSend')
      .mockResolvedValue(undefined);

    const result = await ApplyDamageFlow.sendDecisionMessage(
      makeActor(),
      5,
      true,
      'combat',
      {}
    );

    expect(applySpy).not.toHaveBeenCalled();
    expect(result).toBe('msg1');
  });
});

describe('MatrixDamageFlow.sendDecisionMessage — card cannot be created', () => {
  it('applies the matrix damage directly instead of losing it', async () => {
    globalThis.ChatMessage.create.mockResolvedValue(undefined);
    const applySpy = vi
      .spyOn(MatrixDamageFlow, 'apply')
      .mockResolvedValue(undefined);
    const actor = makeActor();

    const result = await MatrixDamageFlow.sendDecisionMessage(
      actor,
      3,
      'cybercombat'
    );

    expect(applySpy).toHaveBeenCalledWith(3, actor, 'cybercombat');
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('does not fall back while the card is created normally', async () => {
    const applySpy = vi
      .spyOn(MatrixDamageFlow, 'apply')
      .mockResolvedValue(undefined);

    const result = await MatrixDamageFlow.sendDecisionMessage(
      makeActor(),
      3,
      'cybercombat'
    );

    expect(applySpy).not.toHaveBeenCalled();
    expect(result).toBe('msg1');
  });
});
