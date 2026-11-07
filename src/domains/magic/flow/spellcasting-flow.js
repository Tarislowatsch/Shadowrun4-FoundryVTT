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
import {
  askSpellForce,
  confirmAreaTargets,
  openSpellcastingDialog,
} from '../dialogs/index.js';
import {
  AREA_DISMISSED,
  createSpellArea,
  placeSpellArea,
} from '../area-placement.js';
import { CombatSpellFlow } from './combat-spell-flow';
import { OpposedSpellFlow } from './opposed-spell-flow';
import {
  getSpellEffectData,
  requestEffectDecision,
} from './apply-effects-flow';
import {
  resolveSpellTargets,
  resolveTargetingMode,
  sharedHits,
} from '../spell-targeting.js';
import { areaRadius, radiusAdjustCost } from '../area-radius.js';
import { mergeCastOutcomes, sendResistSummary } from '../resist-summary.js';
import { SR4 } from '@config';
import { spellNeedsSight } from '@models/index';

/**
 * @typedef {object} SpellCastResult
 * @property {number} maxHits
 * @property {import('../spell-targeting.js').SpellTargetHits[]} perTarget
 * @property {number} [radius]
 */

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

/**
 * @param {number} force
 * @returns {string}
 */
function formatForceDetails(force) {
  return getGame().i18n?.format('sr4.spell.forceDetails', { force }) ?? '';
}

/**
 * @param {number} force
 * @param {number} radius
 * @returns {string}
 */
function formatAreaDetails(force, radius) {
  return (
    getGame().i18n?.format('sr4.spell.areaDetails', { force, radius }) ?? ''
  );
}

/**
 * @param {import('@models/index').SR4Spell} spell
 * @returns {boolean}
 */
function needsResistingTargets(spell) {
  return spell.system?.category === 'COMBAT' || !!spell.system?.opposed;
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
    if (!getGame().settings.get(SR4.namespace, 'spellWorkflow')) {
      await SpellcastingFlow.rollWithoutWorkflow(actor, spell);
      return;
    }
    const choice = await askSpellForce(
      spell,
      actor,
      getSpellcastingDicePool(actor, spell) ?? 0
    );
    if (choice === null) return;
    const { force, radiusAdjust } = choice;

    const candidates = await SpellcastingFlow._candidateTargets(
      actor,
      spell,
      choice
    );
    if (candidates === null) return;
    const targets = resolveSpellTargets(spell, actor, candidates.actors);
    const mode = resolveTargetingMode(spell, targets);

    let cast;
    if (mode === 'area') {
      cast = await SpellcastingFlow._castArea(
        actor,
        spell,
        force,
        targets,
        radiusAdjust
      );
    } else if (mode === 'split') {
      cast = await SpellcastingFlow._castSplit(actor, spell, force, targets);
    } else {
      cast = await SpellcastingFlow._castSingle(actor, spell, force, targets);
    }
    if (cast === null) return;
    if (candidates.regionData) await createSpellArea(candidates.regionData);

    const drainModifier = await SpellcastingFlow._resolve(
      actor,
      spell,
      force,
      cast
    );
    await SpellcastingFlow.handleDrain(actor, spell, force, drainModifier);
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {import('../dialogs/spellcasting.js').SpellForceChoice} choice
   * @returns {Promise<{ actors: import('@documents/index').SR4Actor[], regionData: object | null } | null>}
   */
  static async _candidateTargets(actor, spell, choice) {
    const marked = { actors: getValidTargetActors(), regionData: null };
    if (!choice.placeTemplate) return marked;
    const area = await placeSpellArea(
      actor,
      spell,
      areaRadius(choice.force, choice.radiusAdjust)
    );
    if (area === null) return marked;
    if (area === AREA_DISMISSED) {
      return SpellcastingFlow._confirmMarkedFallback(marked.actors);
    }
    const confirmed = area.actors.length
      ? await confirmAreaTargets(area.actors)
      : [];
    if (confirmed === null) return null;
    return { actors: confirmed, regionData: area.regionData };
  }

  /**
   * @param {import('@documents/index').SR4Actor[]} markedActors
   * @returns {Promise<{ actors: import('@documents/index').SR4Actor[], regionData: null } | null>}
   */
  static async _confirmMarkedFallback(markedActors) {
    if (!markedActors.length) return null;
    const confirmed = await confirmAreaTargets(markedActors, {
      fallback: true,
    });
    if (confirmed === null) return null;
    return { actors: confirmed, regionData: null };
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
      visibility: spellNeedsSight(spell),
      visualOnly: true,
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} targets
   * @returns {Promise<SpellCastResult | null>}
   */
  static async _castSingle(actor, spell, force, targets) {
    let poolModifier = 0;
    if (spell.system?.category === 'HEALTH' && targets.length === 1) {
      poolModifier = 0 - calculateEssencePenalty(targets[0]);
    }

    const rollResult = await SpellcastingFlow.rollSpellcasting(
      actor,
      spell,
      force,
      { poolModifier, details: formatForceDetails(force) }
    );
    if (rollResult === null || rollResult === undefined) return null;
    const hits = await resolveEdgeForRoll(actor, rollResult, ALWAYS_OFFER_EDGE);
    return { maxHits: hits, perTarget: sharedHits(targets, hits) };
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} targets
   * @param {number} radiusAdjust
   * @returns {Promise<SpellCastResult | null>}
   */
  static async _castArea(actor, spell, force, targets, radiusAdjust) {
    const radius = areaRadius(force, radiusAdjust);
    const rollResult = await SpellcastingFlow.rollSpellcasting(
      actor,
      spell,
      force,
      {
        poolModifier: 0 - radiusAdjustCost(radiusAdjust),
        details: formatAreaDetails(force, radius),
      }
    );
    if (rollResult === null || rollResult === undefined) return null;
    const hits = await resolveEdgeForRoll(actor, rollResult, ALWAYS_OFFER_EDGE);
    return {
      maxHits: hits,
      perTarget: sharedHits(targets, hits),
      radius,
    };
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} targets
   * @returns {Promise<SpellCastResult | null>}
   */
  static async _castSplit(actor, spell, force, targets) {
    const numDice = getSpellcastingDicePool(actor, spell);
    if (numDice === undefined) return null;

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
    if (split === null) return null;

    let anyCast = false;
    let maxHits = 0;
    /** @type {import('../spell-targeting.js').SpellTargetHits[]} */
    const perTarget = [];

    for (const { targetId, allocatedDice, edgePayment } of split.allocations) {
      const target = targets.find((t) => t.uuid === targetId);
      if (!target) continue;

      const penalty = isHealth ? 0 - calculateEssencePenalty(target) : 0;
      const rollResult = await openSpellcastingDialog(
        actor,
        'spellcasting',
        allocatedDice,
        spell,
        force,
        {
          poolModifier: penalty,
          edgePayment,
          details: formatForceDetails(force),
        }
      );
      if (rollResult === null || rollResult === undefined) continue;
      anyCast = true;
      const hits = await resolveEdgeForRoll(
        actor,
        rollResult,
        ALWAYS_OFFER_EDGE
      );
      maxHits = Math.max(maxHits, hits);
      perTarget.push({ target, hits });
    }

    return anyCast ? { maxHits, perTarget } : null;
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {SpellCastResult} cast
   * @returns {Promise<number>}
   */
  static async _resolve(actor, spell, force, cast) {
    if (cast.maxHits < 1) return 0;

    const effectData = getSpellEffectData(spell);
    if (
      cast.perTarget.length === 0 &&
      (needsResistingTargets(spell) || effectData.length > 0)
    ) {
      ui?.notifications?.warn(
        `${spell.name}: ${getGame().i18n?.localize('sr4.spell.noTargets')}`
      );
      return 0;
    }

    if (
      spell.system?.duration === 'SUSTAINED' &&
      getGame().settings.get(SR4.namespace, 'autoSustainEffect')
    ) {
      await actor.applyEffectTemplate('sustain');
    }

    const hitTargets = cast.perTarget.filter(({ hits }) => hits > 0);
    if (needsResistingTargets(spell)) {
      return SpellcastingFlow._resolveResisted(
        actor,
        spell,
        force,
        cast,
        hitTargets
      );
    }
    if (effectData.length > 0) {
      for (const { target } of hitTargets) {
        await requestEffectDecision(target, effectData, spell.name);
      }
    }
    return 0;
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {SpellCastResult} cast
   * @param {import('../spell-targeting.js').SpellTargetHits[]} hitTargets
   * @returns {Promise<number>}
   */
  static async _resolveResisted(actor, spell, force, cast, hitTargets) {
    const summarize = cast.perTarget.length > 1;
    const options = { quiet: summarize };

    let drainModifier = 0;
    let outcomes;
    if (spell.system?.category === 'COMBAT') {
      ({ drainModifier, outcomes } = await CombatSpellFlow.resolve(
        actor,
        spell,
        force,
        hitTargets,
        options
      ));
    } else {
      outcomes = await OpposedSpellFlow.resolve(
        actor,
        spell,
        force,
        hitTargets,
        options
      );
    }

    if (summarize) {
      const details =
        cast.radius === undefined
          ? formatForceDetails(force)
          : formatAreaDetails(force, cast.radius);
      await sendResistSummary(
        actor,
        spell.name,
        details,
        mergeCastOutcomes(cast.perTarget, outcomes)
      );
    }
    return drainModifier;
  }

  /**
   * @param {import('@documents/index').SR4Actor} actor
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {{ poolModifier?: number, details?: string }} [options]
   * @returns {Promise<{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null } | null>}
   */
  static async rollSpellcasting(actor, spell, force, options = {}) {
    const skillName = 'spellcasting';
    const numDice = getSpellcastingDicePool(actor, spell);
    if (numDice === undefined) return null;
    return openSpellcastingDialog(
      actor,
      skillName,
      numDice,
      spell,
      force,
      options
    );
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
