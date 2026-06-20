import {
  askSpellForce,
  getGame,
  getSkillDicePool,
  openSpellcastingDialog,
  openDrainDialog,
} from '@utils/index.js';
import { ApplyDamageFlow, resolveDamageDecision } from './apply-damage-flow';
import { CombatSpellFlow } from './combat-spell-flow';
import { postEdgeRerollOffer } from './util/edge-reroll.handler';

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
    } = drainResult;

    const unresisted = Math.max(baseDrainValue - drainHits, 0);

    /** @type {string[]} */
    const edgeOfferIds = [];
    /** @type {string | null} */
    let pendingDecisionId = null;

    if (!drainEdgeUsed && actor.getAttribute('CURRENTEDGE') > 0) {
      const drainEdgeId = await postEdgeRerollOffer(
        actor,
        { successes: drainHits, rolledDice: drainPool, isGlitch },
        async (newSuccesses) => {
          if (pendingDecisionId) {
            await resolveDamageDecision(pendingDecisionId);
          }
          const newUnresisted = Math.max(baseDrainValue - newSuccesses, 0);
          await ApplyDamageFlow.sendDecisionMessage(
            actor,
            newUnresisted,
            isPhysical,
            'drain'
          );
        }
      );
      edgeOfferIds.push(drainEdgeId);
    }

    pendingDecisionId = await ApplyDamageFlow.sendDecisionMessage(
      actor,
      unresisted,
      isPhysical,
      'drain',
      { edgeOfferIds }
    );
  }
}
