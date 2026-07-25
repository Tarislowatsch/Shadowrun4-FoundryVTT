import { isJammedMatrixEscape } from '@domains/matrix/matrix-rules.js';
import { SR4 } from '@config';
import {
  getInitiativeBase,
  getCombatantRealm,
} from '@domains/combat/initiative.js';

/**
 * Mutates `data` in place (Foundry's preCreateDescendantDocuments contract).
 * @param {import('./actor.js').SR4Actor} actor
 * @param {Array<object>} data
 * @returns {Promise<void>}
 */
export async function handleDescendantItemPreCreate(actor, data) {
  const critterTemplates = data.filter((d) => d.type === 'CritterTemplate');
  if (critterTemplates.length > 0) {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].type === 'CritterTemplate') data.splice(i, 1);
    }
    const tpl = critterTemplates[0];
    const { CritterCreationDialog } = await import(
      '@sheets/importer/critter-creation-dialog.js'
    );
    await CritterCreationDialog.createFromTemplate(tpl.system, tpl.name);
  }

  const hasMetatype = actor.items.some((i) => i.type === 'Metatype');
  const incomingMetatypes = data.filter((d) => d.type === 'Metatype');
  if (hasMetatype && incomingMetatypes.length > 0) {
    ui.notifications?.warn(game.i18n.localize('sr4.metatype.onlyOneAllowed'));
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].type === 'Metatype') data.splice(i, 1);
    }
  } else if (incomingMetatypes.length > 1) {
    ui.notifications?.warn(game.i18n.localize('sr4.metatype.onlyOneAllowed'));
    const firstIdx = data.findIndex((d) => d.type === 'Metatype');
    for (let i = data.length - 1; i > firstIdx; i--) {
      if (data[i].type === 'Metatype') data.splice(i, 1);
    }
  }
}

/**
 * @param {import('./actor.js').SR4Actor} actor
 * @param {object} changed
 * @returns {boolean} true if the update must be blocked
 */
export function shouldBlockJammedMatrixUpdate(actor, changed) {
  /** @type {any} */
  const self = actor;
  const jammedBy = self.system?.matrix?.jammedBy;
  if (!jammedBy) return false;

  const matrixChange = changed.system?.matrix;
  const clearingJam =
    matrixChange && 'jammedBy' in matrixChange && !matrixChange.jammedBy;
  if (
    !isJammedMatrixEscape(jammedBy, {
      changedRealm: changed.system?.realm,
      changedSimMode: changed.system?.matrixSimMode,
      clearingJam,
    })
  ) {
    return false;
  }
  ui?.notifications?.warn(
    game.i18n.localize('sr4.matrix.cybercombat.jammedBlock')
  );
  return true;
}

/**
 * @param {import('./actor.js').SR4Actor} actor
 * @returns {Map<string, { combatant: object, score: number }>}
 */
export function captureLiveInitiativeScores(actor) {
  /** @type {any} */
  const self = actor;
  const map = new Map();
  for (const combat of game?.combats ?? []) {
    const combatants = combat.combatants.filter((c) => c.actor?.id === self.id);
    for (const combatant of combatants) {
      if (combatant.initiative === null) continue;
      if (combatant.initiative >= SR4.rules.edgeInitiativeSentinel) continue;
      const base = getInitiativeBase(self, getCombatantRealm(combatant));
      map.set(combatant.id, { combatant, score: base - self.getMalus() });
    }
  }
  return map;
}

/**
 * @param {import('./actor.js').SR4Actor} actor
 * @param {Map<string, { combatant: object, score: number }> | undefined} oldScores
 * @returns {Promise<void>}
 */
export async function applyLiveInitiativeUpdate(actor, oldScores) {
  if (!oldScores) return;
  const newScores = captureLiveInitiativeScores(actor);
  for (const [combatantId, { combatant, score }] of newScores) {
    const previous = oldScores.get(combatantId);
    if (!previous) continue;
    const delta = score - previous.score;
    if (delta === 0) continue;
    await combatant.update({
      initiative: Math.max(0, combatant.initiative + delta),
    });
  }
}
