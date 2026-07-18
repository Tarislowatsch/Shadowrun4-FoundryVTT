// @ts-nocheck
import { SR4 } from '../config.js';
import { resolveRiggerSync } from '@utils/rigging/drone-pool.js';
import { REALM_CHOICES } from '@models/shared';
import {
  computeRealmPasses,
  matrixSimPasses,
  hasMatrixAccess,
} from './derivedStats.mapper.js';

/** @type {readonly string[]} */
export const REALMS = REALM_CHOICES;

/**
 * @param {import('@documents/index').SR4Combatant} combatant
 * @returns {string}
 */
export function getCombatantRealm(combatant) {
  return (
    combatant?.getFlag?.('shadowrun4e', 'realm') ??
    combatant?.actor?.system?.realm ??
    'physical'
  );
}

/**
 * @param {number} baseScore
 * @returns {number}
 */
export function edgeFirstInitiative(baseScore) {
  return SR4.rules.edgeInitiativeSentinel + baseScore / 100;
}

/**
 * @param {number} score
 * @returns {number}
 */
export function glitchInitiative(score) {
  return score - SR4.rules.initiativeGlitchTiebreak;
}

/**
 * @param {number|null|undefined} lockedPasses
 * @param {number} livePasses
 * @returns {number}
 */
export function effectivePassCount(lockedPasses, livePasses) {
  return Math.min(lockedPasses ?? livePasses, livePasses);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} realm
 * @returns {number}
 */
export function getInitiativeBase(actor, realm) {
  if (!actor) return 0;
  switch (realm) {
    case 'matrix':
      return actor.system.derivedStats?.initiative?.matrix ?? 0;
    case 'astral':
      return actor.system.derivedStats?.initiative?.astral ?? 0;
    case 'physical':
    default:
      return actor.getInitiativeBase();
  }
}

/**
 * @param {import('@documents/index').SR4Combatant} combatant
 * @param {string} [realm]
 * @returns {number}
 */
export function getPassCount(combatant, realm = getCombatantRealm(combatant)) {
  let actor = combatant?.actor;
  if (!actor) return 1;
  if (actor.type === 'vehicle' && actor.system?.controlMode !== 'autonomous') {
    actor = resolveRiggerSync(actor) ?? actor;
  }
  const passes = actor.system?.modifiers?.initiative?.passes;
  if (realm === 'matrix') {
    return matrixSimPasses(actor.system) + (passes?.matrix ?? 0);
  }
  const realmPasses = parsePassesString(actor.system);
  return realm === 'astral' ? realmPasses.astral : realmPasses.physical;
}

/**
 * @param {object} system
 * @returns {{ physical: number, astral: number, matrix: number }}
 */
function parsePassesString(system) {
  const parts = (system?.derivedStats?.passesString ?? '')
    .split('/')
    .map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return { physical: parts[0], matrix: parts[1], astral: parts[2] };
  }
  return computeRealmPasses(system);
}

/**
 * Realms this actor can meaningfully switch to in combat.
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {string[]}
 */
export function getAvailableRealms(actor) {
  if (!actor) return ['physical'];
  if (actor.type === 'vehicle') return ['physical'];
  const realms = ['physical'];
  const system = actor.system;
  if (hasMatrixAccess(system, actor.items ?? [])) realms.push('matrix');
  const magic = system?.magic;
  const canProject = magic?.magician === true && magic?.adept !== true;
  if (canProject || actor.type === 'spirit') realms.push('astral');
  return realms;
}
