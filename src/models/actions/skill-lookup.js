export const SKILL_LABEL_PREFIX = 'sr4.skills.';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSkillKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} skillRef
 * @returns {string}
 */
export function skillLabelFor(skillRef) {
  const ref = String(skillRef ?? '').trim();
  if (ref.startsWith('sr4.')) return ref;
  return `${SKILL_LABEL_PREFIX}${normalizeSkillKey(ref)}`;
}

/**
 * @param {Iterable<any>} items
 * @param {string} skillRef
 * @returns {import('@models/index').SR4Skill | null}
 */
export function findSkillIn(items, skillRef) {
  const label = skillLabelFor(skillRef);
  const key = normalizeSkillKey(skillRef);
  let byName = null;
  for (const item of items) {
    if (item.type !== 'Skill') continue;
    if (item.system?.label === label) return item;
    if (!byName && key && normalizeSkillKey(item.name) === key) byName = item;
  }
  return byName;
}
