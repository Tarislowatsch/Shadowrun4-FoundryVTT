import {
  computeMatrixResponse,
  computeMatrixSystem,
  computeMatrixFirewall,
  computeBiofeedbackFilter,
  effectiveSimMode,
} from '@documents/derivedStats.mapper.js';

/**
 * @type {Record<string, { category: string, names: string[] }>}
 */
export const MATRIX_ATTACK_PROGRAMS = Object.freeze({
  attack: { category: 'attack', names: ['attack'] },
  blackHammer: {
    category: 'blackHammer',
    names: ['black hammer', 'blackhammer'],
  },
  blackout: { category: 'blackout', names: ['blackout'] },
});

/**
 * @param {string} [name]
 * @param {string} [category]
 * @returns {'attack'|'blackHammer'|'blackout'|null}
 */
export function classifyMatrixProgram(name = '', category = '') {
  const normCat = category.trim().toLowerCase();
  const normName = name.trim().toLowerCase();
  for (const [key, def] of Object.entries(MATRIX_ATTACK_PROGRAMS)) {
    if (normCat === def.category.toLowerCase()) return key;
  }
  for (const [key, def] of Object.entries(MATRIX_ATTACK_PROGRAMS)) {
    if (def.names.some((n) => normName === n)) return key;
  }
  return null;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {boolean}
 */
function isDeviceActor(actor) {
  return actor?.type === 'device';
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {boolean}
 */
function isSpriteActor(actor) {
  return actor?.type === 'sprite';
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @returns {number}
 */
function skillRating(actor, skillName) {
  return actor.getSkill?.(skillName)?.system?.rating ?? 0;
}

/**
 * @typedef {object} MatrixPersona
 * @property {boolean} isDevice
 * @property {boolean} isSprite
 * @property {boolean} isTechnomancer
 * @property {number} response
 * @property {number} firewall
 * @property {number} system
 * @property {number} biofeedbackFilter
 * @property {'cold'|'hot'} simMode
 * @property {boolean} inVR
 * @property {number} rating
 */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {MatrixPersona}
 */
export function getMatrixPersona(actor) {
  const sys = /** @type {any} */ (actor).system;

  if (isDeviceActor(actor)) {
    return {
      isDevice: true,
      isSprite: false,
      isTechnomancer: false,
      response: sys.response ?? 0,
      firewall: sys.firewall ?? 0,
      system: sys.system ?? 0,
      biofeedbackFilter: 0,
      simMode: 'cold',
      inVR: false,
      rating: sys.pilot ?? 0,
    };
  }

  if (isSpriteActor(actor)) {
    const ss = sys.sheetStats ?? {};
    return {
      isDevice: false,
      isSprite: true,
      isTechnomancer: false,
      response: ss.INTUITION ?? 0,
      firewall: ss.LOGIC ?? 0,
      system: sys.rating ?? 0,
      biofeedbackFilter: 0,
      simMode: 'cold',
      inVR: false,
      rating: sys.rating ?? 0,
    };
  }

  const items = [...(actor.items ?? [])];
  const isTechnomancer = sys.technomancy?.technomancer === true;

  return {
    isDevice: false,
    isSprite: false,
    isTechnomancer,
    response: computeMatrixResponse(sys, items),
    firewall: computeMatrixFirewall(sys, items),
    system: computeMatrixSystem(sys, items),
    biofeedbackFilter: computeBiofeedbackFilter(sys, items),
    simMode: effectiveSimMode(sys),
    inVR: sys.realm === 'matrix',
    rating: 0,
  };
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {{ id: string|null, name: string, category: 'attack'|'blackHammer'|'blackout', rating: number }[]}
 */
export function getOffensivePrograms(actor) {
  /** @type {{ id: string|null, name: string, category: 'attack'|'blackHammer'|'blackout', rating: number }[]} */
  const result = [];

  for (const item of actor.items ?? []) {
    if (item.type !== 'Program') continue;
    const category = classifyMatrixProgram(item.name, item.system?.category);
    if (!category) continue;
    result.push({
      id: item.id ?? null,
      name: item.name,
      category,
      rating: item.system?.rating ?? item.system?.maxrating ?? 0,
    });
  }

  for (const item of actor.items ?? []) {
    if (item.type !== 'Commlink' || !item.system?.equipped) continue;
    for (const prog of item.system?.programms ?? []) {
      const category = classifyMatrixProgram(prog?.name, prog?.category);
      if (!category) continue;
      result.push({
        id: null,
        name: prog?.name ?? '',
        category,
        rating: prog?.rating ?? 0,
      });
    }
  }

  return result;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} programRating
 * @returns {number}
 */
export function getMatrixAttackPool(actor, programRating) {
  if (isDeviceActor(actor) || isSpriteActor(actor)) {
    return getMatrixPersona(actor).rating + programRating;
  }
  const skill = actor.getSkill?.('cybercombat');
  const skillRating = skill ? (skill.system?.rating ?? 0) : -1;
  return Math.max(skillRating + programRating, 1);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {boolean} [fullDefense]
 * @returns {number}
 */
export function getMatrixDefensePool(actor, fullDefense = false) {
  const persona = getMatrixPersona(actor);
  let pool = persona.response + persona.firewall;
  if (fullDefense) {
    pool +=
      persona.isDevice || persona.isSprite
        ? persona.rating
        : skillRating(actor, 'hacking');
  }
  return Math.max(pool, 1);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{ biofeedback?: boolean }} [options]
 * @returns {number}
 */
export function getMatrixResistPool(actor, { biofeedback = false } = {}) {
  const persona = getMatrixPersona(actor);
  if (biofeedback) {
    const willpower = actor.getAttribute?.('WILLPOWER') ?? 0;
    return Math.max(willpower + persona.biofeedbackFilter, 1);
  }
  return Math.max(persona.system + getArmorProgramRating(actor), 1);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {number}
 */
function getArmorProgramRating(actor) {
  const armor = [...(actor.items ?? [])].find(
    (i) =>
      i.type === 'Program' &&
      (i.system?.category === 'armor' || /armor/i.test(i.name ?? ''))
  );
  return armor?.system?.rating ?? 0;
}
