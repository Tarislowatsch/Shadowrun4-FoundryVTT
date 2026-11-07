import { describe, it, expect, vi, beforeEach } from 'vitest';

const createRollDialogMock = vi.fn();
const dialogActionsMock = vi.fn();

vi.mock('@utils/templates', () => ({
  TEMPLATES: { ui: { dialogs: { roll: 'roll.hbs' } }, magic: {} },
  renderTemplate: vi.fn(async () => '<form></form>'),
}));

vi.mock('@utils/dialog', () => ({
  createRollDialog: (config) => createRollDialogMock(config),
  localize: (key) => key,
  createDialogParameters: () => ({}),
  dialogActions: (...args) => dialogActionsMock(...args),
  promptDialog: vi.fn(),
}));

const { openSpellcastingDialog } = await import(
  '../src/domains/magic/dialogs/spellcasting.js'
);

const actor = { name: 'Caster' };
const spell = { name: 'Fireball', system: { range: 'LOS' } };

beforeEach(() => {
  vi.clearAllMocks();
  createRollDialogMock.mockImplementation(async (config) =>
    config.onRoll('dialog')
  );
});

describe('openSpellcastingDialog', () => {
  it('forwards the details line to the roll', async () => {
    await openSpellcastingDialog(actor, 'spellcasting', 8, spell, 4, {
      poolModifier: -2,
      details: 'Force 4 · Radius 3 m',
    });

    expect(dialogActionsMock).toHaveBeenCalledWith(
      'dialog',
      actor,
      'spellcasting',
      6,
      undefined,
      { edgePayment: null, details: 'Force 4 · Radius 3 m' }
    );
  });

  it('never rolls fewer than one die', async () => {
    await openSpellcastingDialog(actor, 'spellcasting', 2, spell, 4, {
      poolModifier: -5,
    });

    expect(createRollDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ dice: 1 })
    );
  });
});
