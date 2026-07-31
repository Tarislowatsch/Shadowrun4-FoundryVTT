import { describe, it, expect, vi, beforeEach } from 'vitest';

const dialogPromptMock = vi.fn();

vi.mock('@utils/templates', () => ({
  TEMPLATES: { magic: { directSpellAllocation: 'allocation.hbs' } },
  renderTemplate: vi.fn().mockResolvedValue('<form></form>'),
}));

vi.mock('@utils/dialog', () => ({
  createRollDialog: vi.fn(),
  localize: (key) => key,
  createDialogParameters: vi.fn().mockReturnValue({}),
  dialogActions: vi.fn(),
  getChecked: vi.fn().mockReturnValue(false),
  getInt: vi.fn().mockReturnValue(0),
  promptDialog: (...args) => dialogPromptMock(...args),
  waitDialog: vi.fn(),
}));

vi.mock('@utils/rolls', () => ({
  resolveEdgeForRoll: vi.fn(),
  requestReactiveDecision: vi.fn(),
  DecisionCategory: {},
  DecisionKind: {},
  DecisionRouting: {},
}));

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendDecisionMessage: vi.fn(),
    sendCombatSummary: vi.fn(),
  },
}));

vi.mock('@domains/combat/dialogs/soak.js', () => ({
  openSoakDialog: vi.fn(),
  defaultSoakPool: vi.fn().mockReturnValue(0),
}));

vi.mock('@domains/magic/dialogs/resist-actions.js', () => ({
  resolveAndEmitSpellResist: vi.fn(),
  spellResistPool: vi.fn().mockReturnValue(0),
  directSpellResistAttribute: vi.fn(),
  localizeResistAttribute: vi.fn(),
}));

vi.mock('@domains/magic/flow/apply-effects-flow.js', () => ({
  getSpellEffectData: vi.fn().mockReturnValue([]),
  sendEffectDecisionMessage: vi.fn(),
}));

const { openDirectSpellAllocationDialog } = await import(
  '../src/domains/magic/dialogs/combat-spell.js'
);

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.foundry.applications = {
    api: { DialogV2: { prompt: (...args) => dialogPromptMock(...args) } },
  };
});

describe('openDirectSpellAllocationDialog', () => {
  it('skips the dialog when the single net hit leaves nothing to allocate', async () => {
    const applied = await openDirectSpellAllocationDialog('Manabolt', 4, 1);

    expect(applied).toBe(0);
    expect(dialogPromptMock).not.toHaveBeenCalled();
  });

  it('opens the dialog once there are bonus hits to distribute', async () => {
    dialogPromptMock.mockResolvedValue(2);

    const applied = await openDirectSpellAllocationDialog('Manabolt', 4, 3);

    expect(dialogPromptMock).toHaveBeenCalled();
    expect(applied).toBe(2);
  });

  it('caps the offered bonus hits at Force', async () => {
    dialogPromptMock.mockResolvedValue(0);

    await openDirectSpellAllocationDialog('Manabolt', 2, 6);

    const { renderTemplate } = await import('@utils/templates');
    expect(renderTemplate).toHaveBeenCalledWith(
      'allocation.hbs',
      expect.objectContaining({ bonusHits: 2 })
    );
  });
});
