import { SR4ActiveEffect } from '@effects/index';

const ELEMENT_RESISTANCE_MAP = Object.freeze({
  ICE: 'COLD',
});

const ELEMENT_HINT_KEYS = Object.freeze({
  METAL: 'sr4.damage.metalHint',
  TOXIN: 'sr4.damage.toxinHint',
  BLAST: 'sr4.damage.blastHint',
  LIGHT: 'sr4.damage.lightHint',
  ICE: 'sr4.damage.coldHint',
  FIRE: 'sr4.damage.fireHint',
  ELECTRICITY: 'sr4.damage.electricityHint',
  ACID: 'sr4.damage.acidHint',
  SAND: 'sr4.damage.sandHint',
  WATER: 'sr4.damage.waterHint',
  RADIATION: 'sr4.damage.radiationHint',
  SMOKE: 'sr4.damage.smokeHint',
  SOUND: 'sr4.damage.soundHint',
});

/**
 * @param {string} element
 * @returns {string}
 */
function mapToResistanceElement(element) {
  return ELEMENT_RESISTANCE_MAP[element] ?? element;
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {string | undefined} element
 * @returns {number}
 */
export function getElementResistance(defender, element) {
  if (!element) return 0;
  const mapped = mapToResistanceElement(element);
  /** @type {Record<string, import('@models/actor/basecharacter.model').SR4ElementResistance>} */
  const resistances =
    /** @type {any} */ (defender).system?.elementResistances ?? {};
  let total = 0;
  for (const r of Object.values(resistances)) {
    if (r.element === mapped) total += r.value;
  }
  return total;
}

/**
 * @param {string | undefined} element
 * @param {number} impactArmor
 * @returns {{ effectiveArmor: number, apHalf: boolean, dvBonus: number, noArmor: boolean, hint: string | undefined }}
 */
export function computeElementArmorRules(element, impactArmor) {
  const hintKey = element ? ELEMENT_HINT_KEYS[element] : undefined;
  const hint = hintKey ? game.i18n?.localize(hintKey) : undefined;

  if (element === 'METAL') {
    return {
      effectiveArmor: Math.max(impactArmor, 0),
      apHalf: false,
      dvBonus: 2,
      noArmor: false,
      hint,
    };
  }

  if (
    element === 'TOXIN' ||
    element === 'RADIATION' ||
    element === 'SMOKE' ||
    element === 'SOUND'
  ) {
    return {
      effectiveArmor: 0,
      apHalf: false,
      dvBonus: 0,
      noArmor: true,
      hint,
    };
  }

  if (!element) {
    return {
      effectiveArmor: Math.max(Math.ceil(impactArmor / 2), 0),
      apHalf: true,
      dvBonus: 0,
      noArmor: false,
      hint: undefined,
    };
  }

  return {
    effectiveArmor: Math.max(Math.ceil(impactArmor / 2), 0),
    apHalf: true,
    dvBonus: 0,
    noArmor: false,
    hint,
  };
}

/**
 * @param {import('@models/index').SR4Spell} spell
 * @returns {string}
 */
export function resolveIndirectSpellDamageType(spell) {
  const sys = spell.system ?? spell;
  if (sys.damageTypeOverride) return sys.damageType || 'PHYSICAL';
  return sys.element || 'PHYSICAL';
}

/**
 * @param {string | undefined} element
 * @param {import('@documents/index').SR4Actor} target
 * @param {number} netHits
 * @returns {(() => Promise<void>) | undefined}
 */
export function buildElementOnApply(element, target, netHits) {
  if (element !== 'ELECTRICITY') return undefined;
  return async () => {
    await SR4ActiveEffect.fromTemplate('disoriented', target, {
      duration: { turns: 2 + netHits },
    });
  };
}
