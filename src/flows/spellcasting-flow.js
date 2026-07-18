import {
  askSpellForce,
  calculateWillpowerResistancePool,
  getGame,
  getSkillDicePool,
  getValidTargetActors,
  openSpellcastingDialog,
  resolveDrain,
} from '@utils/index.js';
import { CombatSpellFlow } from './combat-spell-flow';
import { OpposedSpellFlow } from './opposed-spell-flow';
import {
  getSpellEffectData,
  sendEffectDecisionMessage,
} from './apply-effects-flow';
import { openDicePoolSplitDialog } from '@utils/dialog/dice-pool-split.js';

/**
 * @param {import('@documents/index').SR4Actor} target
 * @returns {number}
 */
function calculateEssencePenalty(target) {
  const essence = target.getAttribute('ESSENCE') ?? 6;
  return Math.max(0, Math.floor(6 - essence));
}

/**
 * @param {number} force
 * @param {number} dv
 * @param {number} [drainModifier]
 * @returns {number}
 */
function calculateDrainValue(force, dv, drainModifier = 0) {
  return Math.floor(force / 2) + dv + drainModifier;
}

export class SpellcastingFlow {
  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @returns {Promise<void>}
   */
  static async start(actor, spell) {
    if (!getGame().settings.get('shadowrun4e', 'spellWorkflow')) return;
    if (!actor.getAttribute('MAGIC')) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }
    const force = await askSpellForce(spell, actor);
    if (force === null) return;

    const targets = getValidTargetActors();
    const isMultiTarget = targets.length > 1 && !spell.system?.area;

    if (isMultiTarget) {
      await SpellcastingFlow._handleMultiTarget(actor, spell, force, targets);
    } else {
      await SpellcastingFlow._handleSingleTarget(actor, spell, force);
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @returns {Promise<void>}
   */
  static async _handleSingleTarget(actor, spell, force) {
    let poolModifier = 0;
    if (spell.system?.category === 'HEALTH') {
      const targets = getValidTargetActors();
      if (targets.length === 1) {
        poolModifier = -calculateEssencePenalty(targets[0]);
      }
    }

    const rollResult = await SpellcastingFlow.rollSpellcasting(
      actor,
      spell,
      force,
      poolModifier
    );
    if (rollResult === null || rollResult === undefined) return;
    const { successes: hits, isGlitch } = rollResult;
    if (
      spell.system?.duration === 'SUSTAINED' &&
      !isGlitch &&
      getGame().settings.get('shadowrun4e', 'autoSustainEffect')
    ) {
      await actor.applyEffectTemplate('sustain');
    }
    if (!isGlitch && hits > 0 && spell.system?.category !== 'COMBAT') {
      if (spell.system?.opposed) {
        await OpposedSpellFlow.start(actor, spell, hits, force);
      } else {
        const effectData = getSpellEffectData(spell);
        if (effectData.length > 0) {
          for (const target of getValidTargetActors()) {
            await sendEffectDecisionMessage(target, effectData, spell.name);
          }
        }
      }
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
   * @param {import('@documents/index').SR4Actor[]} targets
   * @returns {Promise<void>}
   */
  static async _handleMultiTarget(actor, spell, force, targets) {
    const numDice = getSkillDicePool(actor, 'spellcasting');
    if (numDice === undefined) return;

    const isHealth = spell.system?.category === 'HEALTH';
    const splitTargets = targets.map((t) => ({
      id: t.uuid ?? '',
      name: t.name,
      essencePenalty: isHealth ? calculateEssencePenalty(t) : 0,
    }));

    const allocations = await openDicePoolSplitDialog(
      numDice,
      splitTargets,
      spell.name
    );
    if (!allocations) return;

    let sustainApplied = false;
    let anyCast = false;
    let maxDrainModifier = 0;
    const isCombat = spell.system?.category === 'COMBAT';
    /** @type {{ target: import('@documents/index').SR4Actor, hits: number }[]} */
    const perTargetHits = [];

    for (const { targetId, allocatedDice } of allocations) {
      const target = targets.find((t) => t.uuid === targetId);
      if (!target) continue;

      const penalty = isHealth ? -calculateEssencePenalty(target) : 0;

      const rollResult = await openSpellcastingDialog(
        actor,
        'spellcasting',
        allocatedDice,
        spell,
        force,
        penalty
      );
      if (rollResult === null || rollResult === undefined) continue;
      anyCast = true;
      const { successes: hits, isGlitch } = rollResult;

      if (
        !sustainApplied &&
        spell.system?.duration === 'SUSTAINED' &&
        !isGlitch &&
        getGame().settings.get('shadowrun4e', 'autoSustainEffect')
      ) {
        await actor.applyEffectTemplate('sustain');
        sustainApplied = true;
      }

      if (isGlitch || hits < 1) continue;

      if (isCombat) {
        perTargetHits.push({ target, hits });
      } else if (spell.system?.opposed) {
        await OpposedSpellFlow.opposedVsTarget(
          actor,
          spell,
          hits,
          force,
          target,
          OpposedSpellFlow.getResistAttribute(spell),
          getSpellEffectData(spell)
        );
      } else {
        const effectData = getSpellEffectData(spell);
        if (effectData.length > 0) {
          await sendEffectDecisionMessage(target, effectData, spell.name);
        }
      }
    }

    if (isCombat && perTargetHits.length > 0) {
      maxDrainModifier = await CombatSpellFlow.startPerTarget(
        actor,
        spell,
        perTargetHits,
        force
      );
    }

    if (anyCast) {
      await SpellcastingFlow.handleDrain(
        actor,
        spell,
        force,
        0,
        maxDrainModifier
      );
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {number} [poolModifier]
   * @returns {Promise<{ successes: number, isGlitch: boolean } | null>}
   */
  static async rollSpellcasting(actor, spell, force, poolModifier = 0) {
    const skillName = 'spellcasting';
    const numDice = getSkillDicePool(actor, skillName);
    if (numDice === undefined) return null;
    return openSpellcastingDialog(
      actor,
      skillName,
      numDice,
      spell,
      force,
      poolModifier
    );
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
    const drainValue = calculateDrainValue(
      force,
      spell.system?.dv ?? 0,
      drainModifier
    );
    const drainPool = calculateWillpowerResistancePool(
      actor,
      actor.system.magic.drainAttribute
    );
    const isPhysical = force > actor.getAttribute('MAGIC');

    await resolveDrain(actor, {
      label: spell.name,
      force,
      drainPool,
      drainValue,
      isPhysical,
    });
  }
}
