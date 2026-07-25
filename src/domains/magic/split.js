import { clamp } from '@utils/math.js';
import {
  hasMatrixAccess,
  matrixSimPasses,
} from '@domains/matrix/derived-stats.js';

/**
 * @param {import('@models/index').SR4BaseCharacterSystem} system
 * @returns {{ physical: number, astral: number, matrix: number }}
 */
export function computeRealmPasses(system) {
  const passes = system?.modifiers?.initiative?.passes;
  const magic = system?.magic;
  const canProject = magic?.magician === true && magic?.adept !== true;
  return {
    physical: 1 + (passes?.physical ?? 0),
    astral: canProject ? 3 + (passes?.astral ?? 0) : 0,
    matrix: hasMatrixAccess(system)
      ? matrixSimPasses(system) + (passes?.matrix ?? 0)
      : 0,
  };
}

/**
 * @param {number} value
 * @param {number} max
 * @returns {number}
 */
function clampToRange(value, max) {
  const numeric = Number.isFinite(value) ? Math.trunc(Number(value)) : 0;
  return clamp(numeric, 0, Math.max(max, 0));
}

/**
 * SR4A p. 199: only mystic adepts split their Magic attribute.
 * @param {{ spellpower?: number, powerPoints?: number, magician?: boolean, adept?: boolean }} magic
 * @param {number} magicAttribute
 * @returns {{ spellpower: number, powerPoints: number, overAllocated: boolean }}
 */
export function resolveMagicSplit(magic, magicAttribute) {
  const max = Math.max(magicAttribute ?? 0, 0);
  const isMagician = magic?.magician === true;
  const isAdept = magic?.adept === true;

  if (!isMagician && !isAdept) {
    return { spellpower: 0, powerPoints: 0, overAllocated: false };
  }
  if (isMagician && !isAdept) {
    return { spellpower: max, powerPoints: 0, overAllocated: false };
  }
  if (isAdept && !isMagician) {
    return { spellpower: 0, powerPoints: max, overAllocated: false };
  }

  const spellpower = clampToRange(magic?.spellpower ?? 0, max);
  const powerPoints = clampToRange(magic?.powerPoints ?? 0, max - spellpower);
  const overAllocated =
    spellpower !== (magic?.spellpower ?? 0) ||
    powerPoints !== (magic?.powerPoints ?? 0);

  return { spellpower, powerPoints, overAllocated };
}

/**
 * SM p. 118: a reduced Magic attribute counts for all uses of magic; for mystic
 * adepts the gamemaster picks which side it is deducted from first.
 * @param {{ spellpower: number, powerPoints: number }} split
 * @param {number} modifier
 * @param {'spellpower' | 'powerPoints'} [priority]
 * @returns {{ spellpower: number, powerPoints: number }}
 */
export function applyMagicModifier(split, modifier, priority = 'spellpower') {
  if (!modifier) return { ...split };
  if (modifier < 0) {
    const bonus = -modifier;
    return {
      spellpower: split.spellpower > 0 ? split.spellpower + bonus : 0,
      powerPoints: split.powerPoints > 0 ? split.powerPoints + bonus : 0,
    };
  }

  const first = priority === 'powerPoints' ? 'powerPoints' : 'spellpower';
  const second = first === 'spellpower' ? 'powerPoints' : 'spellpower';
  const reducedFirst = Math.max(split[first] - modifier, 0);
  const remainder = modifier - (split[first] - reducedFirst);

  return {
    [first]: reducedFirst,
    [second]: Math.max(split[second] - remainder, 0),
  };
}

/**
 * @param {import('@models/index').SR4BaseCharacterSystem} system
 * @returns {{ spellpower: number, powerPoints: number, magicOverAllocated: boolean }}
 */
export function computeMagicSplit(system) {
  const { spellpower, powerPoints, overAllocated } = resolveMagicSplit(
    system?.magic,
    system?.sheetStats?.MAGIC ?? 0
  );
  return { spellpower, powerPoints, magicOverAllocated: overAllocated };
}
