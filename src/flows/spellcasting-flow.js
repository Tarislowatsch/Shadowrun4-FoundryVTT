import {
  askSpellForce,
  getGame,
  getSkillDicePool,
  openSpellcastingDialog,
  openDrainDialog,
} from '@utils/index.js';
import { ApplyDamageFlow } from './apply-damage-flow';
import { CombatSpellFlow } from './combat-spell-flow';
import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';

/**
 * @param {number} force
 * @param {number} dv
 * @param {number} [drainModifier]
 * @returns {number}
 */
function calculateDrainValue(force, dv, drainModifier = 0) {
  return Math.floor(force / 2) + dv + drainModifier;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {number}
 */
function calculateDrainPool(actor) {
  const willpower = actor.getAttribute(sr4.config.attributes.WILLPOWER) ?? 0;
  const drainAttribute =
    actor.getAttribute(actor.system.magic.drainAttribute) ?? 0;
  return willpower + drainAttribute;
}

// ─── Main flow ────────────────────────────────────────────────────────────────
export class SpellcastingFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @returns {Promise<void>}
   */
  static async start(actor, spell) {
    if (!game.settings.get('shadowrun4e', 'spellWorkflow')) return;
    if (!actor.getAttribute('MAGIC')) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }
    const force = await askSpellForce(spell, actor);
    if (force === null) return;
    const rollResult = await SpellcastingFlow.rollSpellcasting(
      actor,
      spell,
      force
    );
    if (rollResult == null) return;
    const { successes: hits, isGlitch } = rollResult;
    if (
      spell.system?.duration === 'SUSTAINED' &&
      !isGlitch &&
      game.settings.get('shadowrun4e', 'autoSustainEffect')
    ) {
      await actor.applyEffectTemplate('sustain');
    }
    let drainModifier = 0;
    if (spell.system?.category === 'COMBAT' && !isGlitch) {
      drainModifier = await CombatSpellFlow.start(actor, spell, hits, force);
    }
    await SpellcastingFlow.handleDrain(
      actor,
      spell,
      force,
      hits,
      drainModifier
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @returns {Promise<{ successes: number, isGlitch: boolean } | null>}
   */
  static async rollSpellcasting(actor, spell, force) {
    const skillName = 'spellcasting';
    const numDice = getSkillDicePool(actor, skillName);
    if (numDice === undefined) return null;
    return openSpellcastingDialog(actor, skillName, numDice, spell, force);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {number} hits
   * @param {number} [drainModifier]
   * @returns {Promise<void>}
   */
  static async handleDrain(actor, spell, force, hits, drainModifier = 0) {
    const baseDrainValue = calculateDrainValue(
      force,
      spell.system?.dv ?? 0,
      drainModifier
    );
    const drainPool = calculateDrainPool(actor);
    const isPhysical = force > actor.getAttribute('MAGIC');

    const drainResult = await openDrainDialog(
      actor,
      spell,
      force,
      drainPool,
      baseDrainValue
    );
    if (drainResult == null) return;
    const {
      successes: drainHits,
      isGlitch,
      edgeUsed: drainEdgeUsed,
      messageId: drainMessageId,
    } = drainResult;

    const finalDrainHits = await resolveEdgeForRoll(
      actor,
      {
        successes: drainHits,
        rolledDice: drainPool,
        isGlitch,
        edgeUsed: drainEdgeUsed,
        messageId: drainMessageId,
      },
      baseDrainValue
    );

    const unresisted = Math.max(baseDrainValue - finalDrainHits, 0);
    await ApplyDamageFlow.sendDecisionMessage(
      actor,
      unresisted,
      isPhysical,
      'drain'
    );
  }
}
