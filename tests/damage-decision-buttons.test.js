import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyAndSendMock = vi.fn();
const resolveDamageDecisionMock = vi.fn();
const openModifyDamageDialogMock = vi.fn();

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: { applyAndSend: (...args) => applyAndSendMock(...args) },
  getDamageDecisionEntry: vi.fn(),
  resolveDamageDecision: (...args) => resolveDamageDecisionMock(...args),
}));

vi.mock('@domains/combat/dialogs/damage.js', () => ({
  openModifyDamageDialog: (...args) => openModifyDamageDialogMock(...args),
}));

const { buildDamageDecisionButtons } = await import(
  '../src/hooks/decision-cards.js'
);

const attack = { gelRounds: true };
const onApply = vi.fn();

function makeEntry(overrides = {}) {
  return {
    actor: { id: 'actor1', name: 'Runner' },
    amount: 5,
    isPhysical: true,
    context: 'combat',
    onApply,
    attack,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildDamageDecisionButtons', () => {
  it('forwards the attack context when applying unchanged damage', async () => {
    const cleanup = vi.fn();
    const [apply] = buildDamageDecisionButtons(makeEntry(), cleanup, 'msg1');

    await apply.onClick();

    expect(cleanup).toHaveBeenCalled();
    expect(resolveDamageDecisionMock).toHaveBeenCalledWith('msg1');
    expect(applyAndSendMock).toHaveBeenCalledWith(
      5,
      true,
      expect.objectContaining({ id: 'actor1' }),
      'combat',
      { onApply, attack }
    );
  });

  it('keeps the attack context when the damage was modified', async () => {
    openModifyDamageDialogMock.mockResolvedValue(2);
    const [, modify] = buildDamageDecisionButtons(makeEntry(), vi.fn(), 'msg1');

    await modify.onClick();

    expect(applyAndSendMock).toHaveBeenCalledWith(
      2,
      true,
      expect.objectContaining({ id: 'actor1' }),
      'combat',
      { onApply, attack }
    );
  });

  it('applies nothing when the modify dialog is cancelled', async () => {
    openModifyDamageDialogMock.mockResolvedValue(null);
    const cleanup = vi.fn();
    const [, modify] = buildDamageDecisionButtons(makeEntry(), cleanup, 'msg1');

    await modify.onClick();

    expect(cleanup).not.toHaveBeenCalled();
    expect(resolveDamageDecisionMock).not.toHaveBeenCalled();
    expect(applyAndSendMock).not.toHaveBeenCalled();
  });

  it('passes an absent attack context through as an explicit undefined', async () => {
    const [apply] = buildDamageDecisionButtons(
      makeEntry({ attack: undefined }),
      vi.fn(),
      'msg1'
    );

    await apply.onClick();

    expect(applyAndSendMock.mock.calls[0][4]).toStrictEqual({
      onApply,
      attack: undefined,
    });
  });

  it('applies once even when modify is clicked twice', async () => {
    openModifyDamageDialogMock.mockResolvedValue(2);
    const [, modify] = buildDamageDecisionButtons(makeEntry(), vi.fn(), 'msg1');

    await Promise.all([modify.onClick(), modify.onClick()]);

    expect(applyAndSendMock).toHaveBeenCalledTimes(1);
  });

  it('lets the player retry after cancelling the modify dialog', async () => {
    openModifyDamageDialogMock.mockResolvedValueOnce(null);
    openModifyDamageDialogMock.mockResolvedValueOnce(2);
    const [, modify] = buildDamageDecisionButtons(makeEntry(), vi.fn(), 'msg1');

    await modify.onClick();
    await modify.onClick();

    expect(applyAndSendMock).toHaveBeenCalledTimes(1);
    expect(applyAndSendMock.mock.calls[0][0]).toBe(2);
  });
});
