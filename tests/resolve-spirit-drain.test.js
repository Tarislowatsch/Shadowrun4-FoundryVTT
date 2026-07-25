import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveDrainMock = vi.fn();
const calculateSummonedEntityDrainPoolMock = vi.fn();
const getEffectiveDrainModifierMock = vi.fn(() => 0);

vi.mock('@domains/summoned-entity/dialogs/drain.js', () => ({
  resolveDrain: (...args) => resolveDrainMock(...args),
  calculateSummonedEntityDrainPool: (...args) =>
    calculateSummonedEntityDrainPoolMock(...args),
}));

vi.mock('@utils/scene/scene-modifiers.js', () => ({
  getEffectiveDrainModifier: (...args) =>
    getEffectiveDrainModifierMock(...args),
}));

vi.mock('@utils/dialog/roll-dialog-core.js', () => ({
  localize: (key) => key,
}));

const { resolveSpiritDrain } = await import(
  '../src/domains/summoned-entity/dialogs/resolve-spirit-drain.js'
);

function makeActor({ attributes = {} } = {}) {
  return {
    getAttribute: (key) => attributes[key] ?? 6,
    getSpellpower: () => attributes.MAGIC ?? 6,
  };
}

const labelKeys = {
  spiritLabelKey: 'sr4.magic.bindingDrain',
  spriteLabelKey: 'sr4.magic.registeringFading',
};

beforeEach(() => {
  vi.clearAllMocks();
  calculateSummonedEntityDrainPoolMock.mockReturnValue(8);
});

describe('resolveSpiritDrain', () => {
  it('resolves drain with DV = 2x hits (min 2), Stun when Force <= the resisting stat', async () => {
    const actor = makeActor({ attributes: { MAGIC: 5 } });

    await resolveSpiritDrain(actor, 4, 3, 'spirit', labelKeys);

    expect(resolveDrainMock).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ drainValue: 6, isPhysical: false, force: 4 })
    );
  });

  it('applies the minimum drain value of 2 when no hits were scored', async () => {
    const actor = makeActor({ attributes: { MAGIC: 5 } });

    await resolveSpiritDrain(actor, 4, 0, 'spirit', labelKeys);

    expect(resolveDrainMock).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ drainValue: 2 })
    );
  });

  it('is Physical drain when Force exceeds the resisting stat', async () => {
    const actor = makeActor({ attributes: { MAGIC: 3 } });

    await resolveSpiritDrain(actor, 5, 1, 'spirit', labelKeys);

    expect(resolveDrainMock).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ isPhysical: true })
    );
  });

  it('adds the Background Count modifier for a spirit but not a sprite', async () => {
    getEffectiveDrainModifierMock.mockReturnValue(3);
    const actor = makeActor();

    await resolveSpiritDrain(actor, 4, 3, 'spirit', labelKeys);
    expect(resolveDrainMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ drainValue: 9 })
    );

    await resolveSpiritDrain(actor, 4, 3, 'sprite', labelKeys);
    expect(resolveDrainMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ drainValue: 6 })
    );
  });

  it('picks the spirit vs. sprite label key based on entity type', async () => {
    const actor = makeActor();

    await resolveSpiritDrain(actor, 4, 3, 'spirit', labelKeys);
    expect(resolveDrainMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ label: 'sr4.magic.bindingDrain' })
    );

    await resolveSpiritDrain(actor, 4, 3, 'sprite', labelKeys);
    expect(resolveDrainMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ label: 'sr4.magic.registeringFading' })
    );
  });

  it('calculates the drain pool for the entity type being resolved', async () => {
    const actor = makeActor({ attributes: { RESONANCE: 5 } });

    await resolveSpiritDrain(actor, 4, 1, 'sprite', labelKeys);

    expect(calculateSummonedEntityDrainPoolMock).toHaveBeenCalledWith(
      actor,
      'sprite'
    );
  });
});
