import { describe, it, expect, vi } from 'vitest';
import { getSkillDicePool } from '@utils/dialog/skill-dice.js';

/**
 * @param {{ attribute: string, rating: number, effectiveMagic?: number, attributes?: object }} options
 * @returns {object}
 */
function makeActor({ attribute, rating, effectiveMagic = 0, attributes = {} }) {
  const skill = {
    type: 'Skill',
    name: 'TestSkill',
    system: { attribute, rating, label: '', group: '' },
  };
  return {
    system: {},
    getSkill: () => skill,
    getEffectiveMagic: vi.fn(() => effectiveMagic),
    getAttribute: (key) => attributes[key] ?? 0,
  };
}

describe('getSkillDicePool — MAGIC attribute forwarding', () => {
  it('uses getEffectiveMagic for a MAGIC-based skill', () => {
    const actor = makeActor({
      attribute: 'MAGIC',
      rating: 3,
      effectiveMagic: 2,
    });
    expect(getSkillDicePool(actor, 'TestSkill')).toBe(5);
    expect(actor.getEffectiveMagic).toHaveBeenCalled();
  });

  it('uses the raw attribute for a non-MAGIC skill', () => {
    const actor = makeActor({
      attribute: 'WILLPOWER',
      rating: 3,
      effectiveMagic: 99,
      attributes: { WILLPOWER: 4 },
    });
    expect(getSkillDicePool(actor, 'TestSkill')).toBe(7);
    expect(actor.getEffectiveMagic).not.toHaveBeenCalled();
  });
});
