import { describe, it, expect, vi, beforeEach } from 'vitest';

const createRollDialogMock = vi.fn();
const resolveEdgeForRollMock = vi.fn();
const applyAndSendMock = vi.fn();
const sendDecisionMessageMock = vi.fn();

vi.mock('@utils/templates', () => ({
  TEMPLATES: { ui: { dialogs: { roll: 'roll.hbs' } } },
  renderTemplate: vi.fn().mockResolvedValue('<div></div>'),
}));

vi.mock('@utils/rolls', () => ({
  DiceUtility: { rollAndShow: vi.fn() },
}));

vi.mock('@utils/dialog', () => ({
  createRollDialog: (...args) => createRollDialogMock(...args),
  localize: (key) => key,
  createDialogParameters: () => ({}),
  getChecked: () => false,
  getInt: () => 0,
}));

vi.mock('@utils/rolls/roll-edge-decision.js', () => ({
  resolveEdgeForRoll: (...args) => resolveEdgeForRollMock(...args),
}));

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    applyAndSend: (...args) => applyAndSendMock(...args),
    sendDecisionMessage: (...args) => sendDecisionMessageMock(...args),
  },
}));

const { resolveDrain } = await import(
  '../src/domains/summoned-entity/dialogs/drain.js'
);

const actor = { name: 'Mage' };

function drainOptions(overrides = {}) {
  return {
    label: 'Manabolt',
    force: 4,
    drainPool: 10,
    drainValue: 4,
    isPhysical: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  createRollDialogMock.mockResolvedValue({
    successes: 3,
    isGlitch: false,
    edgeUsed: false,
    messageId: 'msg1',
  });
});

describe('resolveDrain', () => {
  it('sends the damage decision card for the unresisted drain', async () => {
    resolveEdgeForRollMock.mockResolvedValue(1);

    await resolveDrain(actor, drainOptions());

    expect(sendDecisionMessageMock).toHaveBeenCalledWith(
      actor,
      3,
      false,
      'drain'
    );
    expect(applyAndSendMock).not.toHaveBeenCalled();
  });

  it('reports the fully resisted drain instead of staying silent', async () => {
    resolveEdgeForRollMock.mockResolvedValue(5);

    await resolveDrain(actor, drainOptions());

    expect(applyAndSendMock).toHaveBeenCalledWith(0, false, actor, 'drain');
    expect(sendDecisionMessageMock).not.toHaveBeenCalled();
  });

  it('says nothing when the drain dialog is dismissed', async () => {
    createRollDialogMock.mockResolvedValue(null);

    await resolveDrain(actor, drainOptions());

    expect(applyAndSendMock).not.toHaveBeenCalled();
    expect(sendDecisionMessageMock).not.toHaveBeenCalled();
  });
});
