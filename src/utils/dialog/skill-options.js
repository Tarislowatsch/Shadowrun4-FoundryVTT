import { findSkillIn } from '@models/index';
import { localize } from './roll-dialog-core.js';

/**
 * @typedef {{ value: string, label: string, rating: number }} SkillOption
 */

/**
 * @param {any} skill
 * @returns {string}
 */
export function skillDisplayLabel(skill) {
  return skill.system?.label ? localize(skill.system.label) : skill.name;
}

/**
 * @param {{ items?: Iterable<any> } | null} actor
 * @param {string[]} skillRefs
 * @returns {SkillOption[]}
 */
export function buildSkillOptions(actor, skillRefs) {
  if (!actor?.items) return [];
  /** @type {SkillOption[]} */
  const options = [];
  for (const ref of skillRefs) {
    const skill = findSkillIn(actor.items, ref);
    const rating = skill?.system?.rating ?? 0;
    if (!skill || rating <= 0) continue;
    options.push({ value: ref, label: skillDisplayLabel(skill), rating });
  }
  return options;
}

/**
 * @param {SkillOption[]} options
 * @returns {Map<string, number>}
 */
export function ratingBySkill(options) {
  return new Map(options.map((option) => [option.value, option.rating]));
}
