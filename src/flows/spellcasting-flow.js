import {
  askSpellForce,
  getGame,
  getSkillDicePool,
  openSpellcastingDialog,
  openDrainDialog,
} from '@utils/index.js';
import { ApplyDamageFlow } from './apply-damage-flow';
import { createEdgeRerollHandler } from './util/edge-reroll.handler';

/**
 * @param {number} force
 * @param {number} dv
 * @returns {number}
 */
function calculateDrainValue(force, dv) {
  return Math.floor(force / 2) + dv;
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
    if (!actor.system.sheetStats.MAGIC) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }
    const force = await askSpellForce(spell, actor);
    if (force === null) return;
    const hits = await SpellcastingFlow.rollSpellcasting(actor, spell, force);
    if (hits === null) return;
    if (
      spell.system?.duration === 'SUSTAINED' &&
      game.settings.get('shadowrun4e', 'autoSustainEffect')
    ) {
      await actor.applyEffectTemplate('sustain');
    }
    await SpellcastingFlow.handleDrain(actor, spell, force, hits);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @returns {Promise<number | null>}
   */
  static async rollSpellcasting(actor, spell, force) {
    const skillName = 'spellcasting';
    const numDice = getSkillDicePool(actor, skillName);
    if (numDice === undefined) return 0;
    return openSpellcastingDialog(actor, skillName, numDice, spell, force);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {number} hits
   * @returns {Promise<void>}
   */
  static async handleDrain(actor, spell, force, hits) {
    const baseDrainValue = calculateDrainValue(force, spell.system?.dv ?? 0);
    const drainPool = calculateDrainPool(actor);
    const isPhysical = force > actor.system.sheetStats.MAGIC;

    const { successes: drainHits, isGlitch } = await openDrainDialog(
      actor,
      spell,
      force,
      drainPool,
      baseDrainValue
    );
    if (drainHits === null) return;

    const applyDrain = async (resolvedHits, edgeUsed = false) => {
      const unresisted = Math.max(baseDrainValue - resolvedHits, 0);

      const onReroll = edgeUsed
        ? undefined
        : createEdgeRerollHandler(
            actor,
            { successes: resolvedHits, rolledDice: drainPool, isGlitch },
            (newSuccesses) => applyDrain(newSuccesses, true)
          );
      await ApplyDamageFlow.sendDecisionMessage(
        actor,
        unresisted,
        isPhysical,
        'drain',
        { onReroll, edgeUsed }
      );
    };

    await applyDrain(drainHits);
  }
}
