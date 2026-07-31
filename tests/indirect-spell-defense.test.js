import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveEdgeForRollMock = vi.fn();
const sendDecisionMessageMock = vi.fn();
const sendCombatSummaryMock = vi.fn();
const dialogWaitMock = vi.fn();
const buildSkillOptionsMock = vi.fn().mockReturnValue([]);

vi.mock('@utils/templates', () => ({
  TEMPLATES: { magic: { indirectSpellDefense: 'indirect.hbs' } },
  renderTemplate: vi.fn().mockResolvedValue('<form></form>'),
}));

vi.mock('@utils/dialog', () => ({
  buildSkillOptions: (...args) => buildSkillOptionsMock(...args),
  createRollDialog: vi.fn(),
  localize: (key) => key,
  createDialogParameters: vi.fn().mockReturnValue({}),
  dialogActions: vi.fn(),
  getChecked: vi.fn().mockReturnValue(false),
  getInt: vi.fn().mockReturnValue(0),
  promptDialog: vi.fn(),
  waitDialog: (...args) => dialogWaitMock(...args),
}));

vi.mock('@utils/rolls', () => ({
  resolveEdgeForRoll: (...args) => resolveEdgeForRollMock(...args),
  requestReactiveDecision: vi.fn(),
  DecisionCategory: {},
  DecisionKind: {},
  DecisionRouting: {},
}));

vi.mock('@domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendDecisionMessage: (...args) => sendDecisionMessageMock(...args),
    sendCombatSummary: (...args) => sendCombatSummaryMock(...args),
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

const { openIndirectSpellDefenseDialog } = await import(
  '../src/domains/magic/dialogs/combat-spell.js'
);

function makeDefender() {
  return {
    name: 'Defender',
    getAttribute: (key) => (key === 'REACTION' ? 4 : 3),
    getSkill: () => null,
    system: { armor: { impact: 0 } },
  };
}

const attacker = { name: 'Caster' };
const spell = {
  name: 'Lightning Bolt',
  system: { element: 'ELECTRICITY', damageType: 'PHYSICAL' },
};

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ui = { notifications: { info: vi.fn(), warn: vi.fn() } };
  globalThis.foundry.applications = {
    api: { DialogV2: { wait: (...args) => dialogWaitMock(...args) } },
  };
  globalThis.game.settings = {
    get: (_scope, key) => key === 'combatDefenseWorkflow',
  };
});

describe('openIndirectSpellDefenseDialog — combatDefenseWorkflow off', () => {
  it('reports the potential damage instead of opening the dodge dialog', async () => {
    globalThis.game.settings = { get: () => false };

    await openIndirectSpellDefenseDialog(makeDefender(), attacker, spell, 3, 4);

    expect(dialogWaitMock).not.toHaveBeenCalled();
    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      'Caster',
      'Defender',
      'potential',
      expect.objectContaining({ hits: 3, damage: 7 })
    );
    expect(sendDecisionMessageMock).not.toHaveBeenCalled();
  });
});

describe('openIndirectSpellDefenseDialog — Edge on the dodge roll', () => {
  it('resolves Edge against the caster hits as threshold', async () => {
    const dodgeResult = {
      successes: 1,
      isGlitch: false,
      rolledDice: 4,
      edgeUsed: false,
      messageId: 'msg1',
    };
    dialogWaitMock.mockResolvedValue(dodgeResult);
    resolveEdgeForRollMock.mockResolvedValue(1);

    await openIndirectSpellDefenseDialog(makeDefender(), attacker, spell, 3, 4);

    expect(resolveEdgeForRollMock).toHaveBeenCalledWith(
      expect.anything(),
      dodgeResult,
      3
    );
  });

  it('uses the post-Edge hits, so an Edge reroll can negate the spell', async () => {
    dialogWaitMock.mockResolvedValue({
      successes: 1,
      isGlitch: false,
      rolledDice: 4,
      edgeUsed: false,
      messageId: 'msg1',
    });
    resolveEdgeForRollMock.mockResolvedValue(3);

    await openIndirectSpellDefenseDialog(makeDefender(), attacker, spell, 3, 4);

    expect(sendCombatSummaryMock).toHaveBeenCalledWith(
      attacker.name,
      'Defender',
      'spellNoEffect',
      { spell: spell.name }
    );
    expect(sendDecisionMessageMock).not.toHaveBeenCalled();
  });

  it('applies damage when the post-Edge hits still fall short', async () => {
    dialogWaitMock.mockResolvedValue({
      successes: 0,
      isGlitch: false,
      rolledDice: 4,
      edgeUsed: false,
      messageId: 'msg1',
    });
    resolveEdgeForRollMock.mockResolvedValue(1);

    await openIndirectSpellDefenseDialog(makeDefender(), attacker, spell, 3, 4);

    expect(sendDecisionMessageMock).toHaveBeenCalled();
  });

  it('does not resolve Edge when the dodge dialog is dismissed', async () => {
    dialogWaitMock.mockResolvedValue(null);

    await openIndirectSpellDefenseDialog(makeDefender(), attacker, spell, 3, 4);

    expect(resolveEdgeForRollMock).not.toHaveBeenCalled();
    expect(sendDecisionMessageMock).not.toHaveBeenCalled();
  });
});
