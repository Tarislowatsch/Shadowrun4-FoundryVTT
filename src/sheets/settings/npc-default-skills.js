import { normalizeSkillKey } from '@models/actions/skill-lookup.js';

export const DEFAULT_NPC_SKILLS = [
  'archery',
  'automatics',
  'blades',
  'clubs',
  'gunnery',
  'heavy-weapons',
  'longarms',
  'pistols',
  'throwing-weapons',
  'unarmed-combat',
  'counterspelling',
  'spellcasting',
  'summoning',
  'gymnastics',
  'infiltration',
  'intimidation',
  'perception',
  'running',
  'swimming',
];

export const DEFAULT_NPC_SKILLS_JSON = JSON.stringify(DEFAULT_NPC_SKILLS);

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function parseNpcDefaultSkills(raw) {
  try {
    const parsed = JSON.parse(raw || DEFAULT_NPC_SKILLS_JSON);
    if (!Array.isArray(parsed))
      return DEFAULT_NPC_SKILLS.map(normalizeSkillKey);
    return parsed
      .filter((s) => typeof s === 'string' || typeof s === 'number')
      .map(normalizeSkillKey);
  } catch {
    return DEFAULT_NPC_SKILLS.map(normalizeSkillKey);
  }
}
