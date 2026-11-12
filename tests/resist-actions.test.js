import { describe, it, expect, vi, beforeEach } from 'vitest';

const rollAndShowMock = vi.fn();
const resolveEdgeForRollMock = vi.fn();
const emitMock = vi.fn();

vi.mock('@utils/rolls/diceutility.js', () => ({
  DiceUtility: { rollAndShow: (...args) => rollAndShowMock(...args) },
}));

vi.mock('@utils/rolls/roll-edge-decision.js', () => ({
  resolveEdgeForRoll: (...args) => resolveEdgeForRollMock(...args),
}));

vi.mock('@utils/game/game.js', () => ({
  getGame: () => ({ socket: { emit: (...args) => emitMock(...args) } }),
}));

const {
  spellResistPool,
  autoResolveSpellResist,
  directSpellResistAttribute,
  rollFallbackSpellResist,
} = await import('@domains/magic/dialogs/resist-actions.js');

function makeDefender({ willpower = 5, counterspelling = 2, wound = -1 } = {}) {
  return {
    uuid: 'defender-uuid',
    getAttribute: (key) =>
      ({ WILLPOWER: willpower, CURRENTEDGE: 0, EDGE: 2 })[key] ?? 0,
    getSkill: (key) =>
      key === 'counterspelling'
        ? { system: { rating: counterspelling } }
        : null,
    system: {
      modifiers: { attackModifier: 0 },
      derivedStats: { dicePoolModifier: wound },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('directSpellResistAttribute', () => {
  it('resists a mana spell with WILLPOWER', () => {
    expect(directSpellResistAttribute(true)).toBe('WILLPOWER');
  });

  it('resists a physical spell with BODY', () => {
    expect(directSpellResistAttribute(false)).toBe('BODY');
  });
});

describe('spellResistPool', () => {
  it('sums the resist attribute and counterspelling rating', () => {
    expect(spellResistPool(makeDefender(), 'WILLPOWER')).toBe(7);
  });

  it('defaults counterspelling to zero when the skill is absent', () => {
    const defender = makeDefender();
    defender.getSkill = () => null;
    expect(spellResistPool(defender, 'WILLPOWER')).toBe(5);
  });
});

describe('autoResolveSpellResist', () => {
  it('rolls the wound-adjusted pool and emits the resolved hits', async () => {
    const defender = makeDefender();
    rollAndShowMock.mockResolvedValue({
      successes: 3,
      isGlitch: false,
      messageId: 'roll-1',
    });
    resolveEdgeForRollMock.mockResolvedValue(3);

    await autoResolveSpellResist({
      defender,
      resistAttribute: 'WILLPOWER',
      label: 'WILLPOWER',
      castingHits: 4,
      socketAction: 'directSpellResisted',
      casterUuid: 'caster-uuid',
    });

    expect(rollAndShowMock.mock.calls[0][0]).toMatchObject({ numDice: 6 });
    expect(emitMock).toHaveBeenCalledOnce();
    const [, message] = emitMock.mock.calls[0];
    expect(message.action).toBe('directSpellResisted');
    expect(message.payload).toMatchObject({
      casterUuid: 'caster-uuid',
      defenderUuid: 'defender-uuid',
      resistHits: 3,
    });
  });
});

describe('rollFallbackSpellResist', () => {
  it('rolls the wound-adjusted pool for the defender without edge', async () => {
    const defender = makeDefender();
    rollAndShowMock.mockResolvedValue({
      successes: 2,
      isGlitch: false,
      messageId: 'roll-2',
    });

    const hits = await rollFallbackSpellResist(defender, 'WILLPOWER');

    expect(hits).toBe(2);
    expect(rollAndShowMock.mock.calls[0][0]).toMatchObject({
      numDice: 6,
      edgeAvailable: false,
      actor: defender,
    });
    expect(resolveEdgeForRollMock).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });
});

describe('rollFallbackSpellResist — failures', () => {
  it('counts a failed fallback roll as no resistance instead of throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rollAndShowMock.mockRejectedValue(new Error('roll failed'));

    await expect(
      rollFallbackSpellResist(makeDefender(), 'WILLPOWER')
    ).resolves.toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('fallback spell resist'),
      expect.any(Error)
    );
  });
});
