import { describe, it, expect, vi, beforeEach } from 'vitest';

const rollAndShowMock = vi.fn();

vi.mock('@utils/rolls/diceutility.js', () => ({
  DiceUtility: { rollAndShow: (...args) => rollAndShowMock(...args) },
}));

const {
  rollForcedSkill,
  getSkillDicePool,
  getSpellCategoryBonus,
  getSpellcastingDicePool,
} = await import('@utils/dialog/dialogutility.js');

/**
 * @param {{ rating?: number, attribute?: string, attributes?: Record<string, number> }} [options]
 */
function makeActor({
  rating = 4,
  attribute = 'CHARISMA',
  attributes = {},
} = {}) {
  return {
    system: { derivedStats: {} },
    getAttribute: (key) => attributes[key] ?? 0,
    getSkill: (name) => ({
      system: {
        rating,
        attribute,
        label: `sr4.skills.${name}`,
        specialization: '',
      },
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.foundry.applications = {
    handlebars: { renderTemplate: async () => '<div></div>' },
    api: {
      DialogV2: {
        prompt: async (config) => {
          const dialog = {
            querySelector: () => null,
            querySelectorAll: () => [],
          };
          return config.ok.callback(null, { closest: () => dialog });
        },
      },
    },
  };
});

describe('getSkillDicePool', () => {
  it('returns undefined when the actor lacks the skill', () => {
    const actor = { getSkill: () => undefined };
    expect(getSkillDicePool(actor, 'binding')).toBeUndefined();
  });

  it('sums the linked attribute and skill rating', () => {
    const actor = makeActor({
      rating: 4,
      attribute: 'CHARISMA',
      attributes: { CHARISMA: 3 },
    });
    expect(getSkillDicePool(actor, 'binding')).toBe(7);
  });
});

describe('getSpellCategoryBonus', () => {
  const spell = (category) => ({ system: { category } });

  it('returns the matching category bonus', () => {
    const actor = {
      system: { modifiers: { spellCategoryBonuses: { COMBAT: 2 } } },
    };
    expect(getSpellCategoryBonus(actor, spell('COMBAT'))).toBe(2);
  });

  it('returns 0 when no bonus is set for the category', () => {
    const actor = {
      system: { modifiers: { spellCategoryBonuses: { COMBAT: 2 } } },
    };
    expect(getSpellCategoryBonus(actor, spell('HEALTH'))).toBe(0);
  });

  it('returns 0 when the bonus is not a number', () => {
    const actor = {
      system: { modifiers: { spellCategoryBonuses: { COMBAT: 'oops' } } },
    };
    expect(getSpellCategoryBonus(actor, spell('COMBAT'))).toBe(0);
  });

  it('coerces numeric string bonuses from applied effects', () => {
    const actor = {
      system: { modifiers: { spellCategoryBonuses: { COMBAT: '2' } } },
    };
    expect(getSpellCategoryBonus(actor, spell('COMBAT'))).toBe(2);
  });

  it('returns 0 when modifiers are missing entirely', () => {
    const actor = { system: {} };
    expect(getSpellCategoryBonus(actor, spell('COMBAT'))).toBe(0);
  });
});

describe('getSpellcastingDicePool', () => {
  const spell = (category) => ({ system: { category } });

  it('returns undefined when the actor lacks the spellcasting skill', () => {
    const actor = { getSkill: () => undefined };
    expect(getSpellcastingDicePool(actor, spell('COMBAT'))).toBeUndefined();
  });

  it('adds the spell category bonus to the skill pool', () => {
    const actor = makeActor({
      rating: 4,
      attribute: 'CHARISMA',
      attributes: { CHARISMA: 2 },
    });
    actor.system.modifiers = { spellCategoryBonuses: { COMBAT: 2 } };
    expect(getSpellcastingDicePool(actor, spell('COMBAT'))).toBe(8);
  });

  it('clamps the pool to a minimum of 1 with negative category bonuses', () => {
    const actor = makeActor({ rating: 1 });
    actor.system.modifiers = { spellCategoryBonuses: { COMBAT: -1 } };
    expect(getSpellcastingDicePool(actor, spell('COMBAT'))).toBe(1);
  });
});

describe('rollForcedSkill', () => {
  it('returns null when the actor has no dice pool for the skill', async () => {
    const actor = { getSkill: () => undefined };
    expect(await rollForcedSkill(actor, 'binding', 4)).toBeNull();
    expect(rollAndShowMock).not.toHaveBeenCalled();
  });

  it('rolls the skill at the computed dice pool and returns the roll result', async () => {
    rollAndShowMock.mockResolvedValue({
      successes: 3,
      isGlitch: false,
      messageId: 'msg-1',
    });
    const actor = makeActor({
      rating: 4,
      attribute: 'CHARISMA',
      attributes: { CHARISMA: 3, CURRENTEDGE: 0, EDGE: 0 },
    });

    const result = await rollForcedSkill(actor, 'binding', 4);

    expect(rollAndShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ numDice: 7, skillName: 'binding' })
    );
    expect(result).toEqual(
      expect.objectContaining({ successes: 3, isGlitch: false, rolledDice: 7 })
    );
  });
});
