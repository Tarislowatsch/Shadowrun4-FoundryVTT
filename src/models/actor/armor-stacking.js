// Armor Stacking & Encumbrance (SR4 p.161, Form-Fitting: Arsenal p.48)

import { getGame } from '@utils/game/game';

/**
 * @param {any} item
 * @param {'effectiveBallistic'|'effectiveImpact'} key
 */
function armorValue(item, key) {
  return (
    item.system?.[key] ??
    item.system?.[
      key === 'effectiveBallistic' ? 'ballisticarmor' : 'impactarmor'
    ] ??
    0
  );
}

/**
 * @param {any[]} equipped
 * @param {{ ballistic: number, impact: number }} bonus
 * @param {number} body
 * @param {number} strength
 * @returns {{ ballistic: number, impact: number, encumbrance: number }}
 */
export function computeArmorStacking(equipped, bonus, body, strength) {
  const standard = [];
  const accessories = [];
  const formFitting = [];
  for (const item of equipped) {
    const type = item.system?.stackingType ?? 'standard';
    if (type === 'accessory') accessories.push(item);
    else if (type === 'formFitting') formFitting.push(item);
    else standard.push(item);
  }

  const sum = (arr, key) => arr.reduce((s, i) => s + armorValue(i, key), 0);

  const bestBallistic = standard.reduce(
    (m, i) => Math.max(m, armorValue(i, 'effectiveBallistic')),
    0
  );
  const bestImpact = standard.reduce(
    (m, i) => Math.max(m, armorValue(i, 'effectiveImpact')),
    0
  );

  const ballistic =
    bestBallistic +
    sum(formFitting, 'effectiveBallistic') +
    sum(accessories, 'effectiveBallistic') +
    bonus.ballistic;
  const impact =
    bestImpact +
    sum(formFitting, 'effectiveImpact') +
    sum(accessories, 'effectiveImpact') +
    bonus.impact;

  const encumbranceBallistic =
    sum(standard, 'effectiveBallistic') +
    sum(accessories, 'effectiveBallistic') +
    formFitting.reduce(
      (s, i) => s + Math.floor(armorValue(i, 'effectiveBallistic') / 2),
      0
    ) +
    bonus.ballistic;
  const encumbranceImpact =
    sum(standard, 'effectiveImpact') +
    sum(accessories, 'effectiveImpact') +
    formFitting.reduce(
      (s, i) => s + Math.floor(armorValue(i, 'effectiveImpact') / 2),
      0
    ) +
    bonus.impact;

  const maxEncumbrance = Math.max(encumbranceBallistic, encumbranceImpact);
  const excess = computeExcessEncumbrance(
    maxEncumbrance,
    body,
    strength,
    equipped.length
  );
  const encumbrance = Math.ceil(excess / 2);

  return { ballistic, impact, encumbrance };
}
/**
 * @param {number} body
 * @param {number} strength
 * @returns {number}
 */
function computeMaxAllowedEncumbrance(body, strength) {
  if (getGame().settings.get('shadowrun4e', 'changeEncumbranceToStrength')) {
    return strength + body;
  }
  return body * 2;
}

/**
 * @param {number} encumbrance
 * @param {number} body
 * @param {number} strength
 * @param {number} equippedArmorCount
 * @returns {number}
 */
function computeExcessEncumbrance(
  encumbrance,
  body,
  strength,
  equippedArmorCount
) {
  if (
    getGame().settings.get('shadowrun4e', 'ignoreEncumbranceSingleArmorItem') &&
    equippedArmorCount === 1
  ) {
    return 0;
  }
  const maxAllowed = computeMaxAllowedEncumbrance(body, strength);
  return Math.max(0, encumbrance - maxAllowed);
}
