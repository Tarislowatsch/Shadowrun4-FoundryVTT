import { sourceOf, upper } from './helpers.js';
import { ATTRIBUTE_ABBR_TO_KEY } from './constants.js';

/**
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapSkill(record) {
  const rawCategory = String(record.category ?? '').trim();
  const isActive = /\bActive\b/i.test(rawCategory);
  const category = rawCategory.replace(/\s*Active\s*$/i, '').toLowerCase();
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Skill',
    type: 'Skill',
    system: {
      attribute: ATTRIBUTE_ABBR_TO_KEY[upper(record.attribute)] ?? '',
      category: category || 'misc',
      group: String(record.skillgroup ?? '').trim(),
      type: isActive ? 'active' : 'knowledge',
      rating: 0,
      source: sourceOf(record),
    },
  };
}
