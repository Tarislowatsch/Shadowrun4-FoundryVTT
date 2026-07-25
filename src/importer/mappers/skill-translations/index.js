import { normalizeSkillName } from '../helpers.js';
import { GERMAN_SKILL_NAMES } from './de.js';

/** @type {Array<Record<string, string>>} */
const LOCALIZED_SKILL_NAMES = [GERMAN_SKILL_NAMES];

/**
 * @param {string} name
 * @returns {string | undefined}
 */
export function translateSkillNameToEnglish(name) {
  const normalized = normalizeSkillName(name);
  for (const dictionary of LOCALIZED_SKILL_NAMES) {
    const match = dictionary[normalized];
    if (match) return match;
  }
  return undefined;
}
