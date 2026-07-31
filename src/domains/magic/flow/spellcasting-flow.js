import {
  getEffectiveDrainModifier,
  getGame,
  getSpellcastingDicePool,
  getValidTargetActors,
  openDicePoolSplitDialog,
  rollSkillDialog,
} from '@utils/index';
import {
  ALWAYS_OFFER_EDGE,
  resolveEdgeForRoll,
} from '@utils/rolls/roll-edge-decision.js';
import {
  calculateWillpowerResistancePool,
  resolveDrain,
} from '@domains/summoned-entity/dialogs/index.js';
import { askSpellForce, openSpellcastingDialog } from '../dialogs/index.js';
import { CombatSpellFlow } from './combat-spell-flow';
import { OpposedSpellFlow } from './opposed-spell-flow';
import {
  getSpellEffectData,
  requestEffectDecision,
} from './apply-effects-flow';

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
    if (!actor.getEffectiveMagic()) {
      ui?.notifications?.error(
        getGame().i18n?.localize('sr4.magic.magicStatZero')
      );
      return;
    }
    if (!getGame().settings.get('shadowrun4e', 'spellWorkflow')) {
      await SpellcastingFlow.rollWithoutWorkflow(actor, spell);
      return;
    }
    const force = await askSpellForce(spell, actor);
    if (force === null) return;

    const targets = getValidTargetActors();
    const isMultiTarget = targets.length > 1 && !spell.system?.area;

    if (isMultiTarget) {
      await SpellcastingFlow._handleMultiTarget(actor, spell, force, targets);
    } else {
      await SpellcastingFlow._handleSingleTarget(actor, spell, force, targets);
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @returns {Promise<void>}
   */
  static async rollWithoutWorkflow(actor, spell) {
    const numDice = getSpellcastingDicePool(actor, spell);
    if (numDice === undefined) return;
    await rollSkillDialog(actor, 'spellcasting', {
      dice: numDice,
      titleSuffix: ` ${spell.name}`,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} targets
   * @returns {Promise<void>}
   */
  static async _handleSingleTarget(actor, spell, force, targets) {
    let poolModifier = 0;
    if (spell.system?.category === 'HEALTH' && targets.length === 1) {
      poolModifier = -calculateEssencePenalty(targets[0]);
    }

    const rollResult = await SpellcastingFlow.rollSpellcasting(
      actor,
      spell,
      force,
      poolModifier
    );
    if (rollResult === null || rollResult === undefined) return;
    const hits = await resolveEdgeForRoll(actor, rollResult, ALWAYS_OFFER_EDGE);
    if (
      spell.system?.duration === 'SUSTAINED' &&
      hits > 0 &&
      getGame().settings.get('shadowrun4e', 'autoSustainEffect')
    ) {
      await actor.applyEffectTemplate('sustain');
    }
    if (hits > 0 && spell.system?.category !== 'COMBAT') {
      if (spell.system?.opposed) {
        await OpposedSpellFlow.start(actor, spell, hits, force, targets);
      } else {
        const effectData = getSpellEffectData(spell);
        if (effectData.length > 0) {
          for (const target of targets) {
            await requestEffectDecision(target, effectData, spell.name);
          }
        }
      }
    }
    let drainModifier = 0;
    if (spell.system?.category === 'COMBAT' && hits > 0) {
      drainModifier = await CombatSpellFlow.start(
        actor,
        spell,
        hits,
        force,
        targets
      );
    }
    await SpellcastingFlow.handleDrain(actor, spell, force, drainModifier);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} targets
   * @returns {Promise<void>}
   */
  static async _handleMultiTarget(actor, spell, force, targets) {
    const numDice = getSpellcastingDicePool(actor, spell);
    if (numDice === undefined) return;

    const isHealth = spell.system?.category === 'HEALTH';
    const splitTargets = targets.map((t) => ({
      id: t.uuid ?? '',
      name: t.name,
      essencePenalty: isHealth ? calculateEssencePenalty(t) : 0,
    }));

    const split = await openDicePoolSplitDialog(
      actor,
      numDice,
      splitTargets,
      spell.name
    );
    if (split === null) return;

    let sustainApplied = false;
    let anyCast = false;
    let maxDrainModifier = 0;
    const isCombat = spell.system?.category === 'COMBAT';
    /** @type {{ target: import('@documents/index').SR4Actor, hits: number }[]} */
    const perTargetHits = [];

    for (const { targetId, allocatedDice, edgePayment } of split.allocations) {
      const target = targets.find((t) => t.uuid === targetId);
      if (!target) continue;

      const penalty = isHealth ? -calculateEssencePenalty(target) : 0;

      const rollResult = await openSpellcastingDialog(
        actor,
        'spellcasting',
        allocatedDice,
        spell,
        force,
        { poolModifier: penalty, edgePayment }
      );
      if (rollResult === null || rollResult === undefined) continue;
      anyCast = true;
      const hits = await resolveEdgeForRoll(
        actor,
        rollResult,
        ALWAYS_OFFER_EDGE
      );

      if (
        !sustainApplied &&
        spell.system?.duration === 'SUSTAINED' &&
        hits > 0 &&
        getGame().settings.get('shadowrun4e', 'autoSustainEffect')
      ) {
        await actor.applyEffectTemplate('sustain');
        sustainApplied = true;
      }

      if (hits < 1) continue;

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
          await requestEffectDecision(target, effectData, spell.name);
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
      await SpellcastingFlow.handleDrain(actor, spell, force, maxDrainModifier);
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {number} [poolModifier]
   * @returns {Promise<{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null } | null>}
   */
  static async rollSpellcasting(actor, spell, force, poolModifier = 0) {
    const skillName = 'spellcasting';
    const numDice = getSpellcastingDicePool(actor, spell);
    if (numDice === undefined) return null;
    return openSpellcastingDialog(actor, skillName, numDice, spell, force, {
      poolModifier,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {number} [drainModifier]
   * @returns {Promise<void>}
   */
  static async handleDrain(actor, spell, force, drainModifier = 0) {
    const drainValue = calculateDrainValue(
      force,
      spell.system?.dv ?? 0,
      drainModifier + getEffectiveDrainModifier(actor)
    );
    const drainPool = calculateWillpowerResistancePool(
      actor,
      actor.system.magic.drainAttribute
    );
    const isPhysical = force > actor.getEffectiveMagic();

    await resolveDrain(actor, {
      label: spell.name,
      force,
      drainPool,
      drainValue,
      isPhysical,
    });
  }
}
