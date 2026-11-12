import { awaitOpposedSocketResponse } from '@utils/index';
import { ApplyDamageFlow } from '@domains/combat/flow/apply-damage-flow.js';
import {
  getSpellEffectData,
  requestEffectDecision,
} from './apply-effects-flow';
import { resistOutcome } from '../resist-summary.js';
import { rollFallbackSpellResist } from '../dialogs/resist-actions.js';

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
   * @param {number} force
   * @param {import('../spell-targeting.js').SpellTargetHits[]} perTarget
   * @param {{ quiet?: boolean }} [options]
   * @returns {Promise<import('../resist-summary.js').SpellResistOutcome[]>}
   */
  static async resolve(
    caster,
    spell,
    force,
    perTarget,
    { quiet = false } = {}
  ) {
    const effectData = getSpellEffectData(spell);
    const resistAttribute = OpposedSpellFlow.getResistAttribute(spell);

    const resisted = await Promise.all(
      perTarget
        .filter(({ target }) => target.uuid)
        .map(async ({ target, hits }) => ({
          target,
          netHits: await OpposedSpellFlow._requestResist(
            caster,
            spell,
            hits,
            force,
            target,
            resistAttribute
          ),
        }))
    );

    for (const { target, netHits } of resisted) {
      await OpposedSpellFlow._applyResult(
        caster,
        spell,
        target,
        netHits,
        effectData,
        quiet
      );
    }
    return resisted.map(({ target, netHits }) =>
      resistOutcome(target, netHits)
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @param {string} resistAttribute
   * @returns {Promise<number>}
   */
  static _requestResist(
    caster,
    spell,
    castingHits,
    force,
    target,
    resistAttribute
  ) {
    const defenderUuid = target.uuid;

    return awaitOpposedSocketResponse({
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
      fallback: async () =>
        Math.max(
          0,
          castingHits - (await rollFallbackSpellResist(target, resistAttribute))
        ),
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {import('@documents/index').SR4Actor} target
   * @param {number} netHits
   * @param {object[]} effectData
   * @param {boolean} quiet
   * @returns {Promise<void>}
   */
  static async _applyResult(caster, spell, target, netHits, effectData, quiet) {
    if (netHits < 1) {
      if (quiet) return;
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
