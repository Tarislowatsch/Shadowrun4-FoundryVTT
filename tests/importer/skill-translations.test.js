import { describe, it, expect } from 'vitest';
import { translateSkillNameToEnglish } from '@importer/mappers/skill-translations/index.js';

describe('translateSkillNameToEnglish', () => {
  it.each([
    ['Schnellfeuerwaffen', 'Automatics'],
    ['schnellfeuerwaffen', 'Automatics'],
    ['Klingenwaffen', 'Blades'],
    ['Knüppel', 'Clubs'],
    ['Knüppel', 'Clubs'],
  ])('translateSkillNameToEnglish(%j) -> %j', (input, expected) => {
    expect(translateSkillNameToEnglish(input)).toBe(expected);
  });

  it('returns undefined for a name with no known translation', () => {
    expect(translateSkillNameToEnglish('Bogenschützerei')).toBeUndefined();
  });

  it('returns undefined for a name that already matches the English compendium', () => {
    expect(translateSkillNameToEnglish('Automatics')).toBeUndefined();
  });
});
