import {
  awaitOpposedSocketResponse,
  getValidTargetActorsOrWarn,
} from '@utils/index';
import { ApplyDamageFlow } from '@domains/combat/flow/apply-damage-flow.js';
import {
  getSpellEffectData,
  requestEffectDecision,
} from './apply-effects-flow';

/**
 * @param {string} category
 * @param {string} spellType
 * @returns {string}
 */
function getOpposedResistAttribute(category, spellType) {
  if (category === 'ILLUSION' && spellType === 'PHYSICAL') return 'INTUITION';
  if (category === 'HEALTH') return 'BODY';
  return 'WILLPOWER';
}

export class OpposedSpellFlow {
  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} [preresolvedTargets]
   * @returns {Promise<void>}
   */
  static async start(caster, spell, castingHits, force, preresolvedTargets) {
    const targets = getValidTargetActorsOrWarn(spell.name, preresolvedTargets);
    if (targets.length === 0) return;

    const effectData = getSpellEffectData(spell);
    const category = spell.system?.category ?? '';
    const spellType = spell.system?.type ?? 'PHYSICAL';
    const resistAttribute = getOpposedResistAttribute(category, spellType);

    for (const target of targets) {
      if (!target.uuid) continue;
      await OpposedSpellFlow.opposedVsTarget(
        caster,
        spell,
        castingHits,
        force,
        target,
        resistAttribute,
        effectData
      );
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @param {string} resistAttribute
   * @param {object[]} effectData
   * @returns {Promise<void>}
   */
  static async opposedVsTarget(
    caster,
    spell,
    castingHits,
    force,
    target,
    resistAttribute,
    effectData
  ) {
    const defenderUuid = target.uuid;

    const netHits = await awaitOpposedSocketResponse({
      triggerAction: 'triggerOpposedSpellResist',
      triggerPayload: {
        defenderUuid,
        casterUuid: caster.uuid,
        spellName: spell.name,
        castingHits,
        force,
        resistAttribute,
      },
      matchAction: 'opposedSpellResisted',
      matches: (payload) =>
        payload?.casterUuid === caster.uuid &&
        payload?.defenderUuid === defenderUuid,
      onMatch: (payload) =>
        payload.resistHits === null
          ? 0
          : Math.max(0, castingHits - payload.resistHits),
      fallback: 0,
    });

    if (netHits < 1) {
      await ApplyDamageFlow.sendCombatSummary(
        caster.name,
        target.name,
        'spellNoEffect',
        { spell: spell.name }
      );
      return;
    }

    if (effectData.length > 0) {
      await requestEffectDecision(target, effectData, spell.name);
    }
  }

  /**
   * @param {import('@models/index').SR4Spell} spell
   * @returns {string}
   */
  static getResistAttribute(spell) {
    return getOpposedResistAttribute(
      spell.system?.category ?? '',
      spell.system?.type ?? 'PHYSICAL'
    );
  }
}
