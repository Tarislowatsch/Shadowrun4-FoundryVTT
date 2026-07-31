export const SKILL_LABEL_PREFIX = 'sr4.skills.';

/**
 * @param {string} skillRef
 * @returns {string}
 */
export function skillLabelFor(skillRef) {
  const ref = String(skillRef ?? '').trim();
  if (ref.startsWith('sr4.')) return ref;
  return `${SKILL_LABEL_PREFIX}${ref.toLowerCase()}`;
}

/**
 * @param {Iterable<any>} items
 * @param {string} skillRef
 * @returns {import('@models/index').SR4Skill | null}
 */
export function findSkillIn(items, skillRef) {
  const label = skillLabelFor(skillRef);
  const lowerRef = String(skillRef ?? '')
    .trim()
    .toLowerCase();
  let byName = null;
  for (const item of items) {
    if (item.type !== 'Skill') continue;
    if (item.system?.label === label) return item;
    if (!byName && item.name?.toLowerCase() === lowerRef) byName = item;
  }
  return byName;
}
