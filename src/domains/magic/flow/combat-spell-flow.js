import { awaitOpposedSocketResponse, emitSystemSocket } from '@utils/index';
import { ApplyDamageFlow } from '@domains/combat/flow/apply-damage-flow.js';
import { isPhysicalDamageType } from '@models/items/weapons.model.js';
import { openDirectSpellAllocationDialog } from '../dialogs/combat-spell.js';
import { getSpellEffectData } from './apply-effects-flow';
import {
  directSpellResistAttribute,
  rollFallbackSpellResist,
} from '../dialogs/resist-actions.js';
import { ResistOutcome, resistOutcome } from '../resist-summary.js';

export class CombatSpellFlow {
  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('../spell-targeting.js').SpellTargetHits[]} perTarget
   * @param {{ quiet?: boolean }} [options]
   * @returns {Promise<{ drainModifier: number, outcomes: import('../resist-summary.js').SpellResistOutcome[] }>}
   */
  static async resolve(
    caster,
    spell,
    force,
    perTarget,
    { quiet = false } = {}
  ) {
    const reachable = perTarget.filter(({ target }) => target.uuid);
    const combatType = spell.system?.combatType ?? 'DIRECT';
    if (combatType === 'DIRECT') {
      return CombatSpellFlow._resolveDirect(
        caster,
        spell,
        force,
        reachable,
        quiet
      );
    }
    await CombatSpellFlow._resolveIndirect(caster, spell, force, reachable);
    return {
      drainModifier: 0,
      outcomes: reachable.map(({ target, hits }) => ({
        target,
        kind: ResistOutcome.DEFENSE_REQUESTED,
        hits,
      })),
    };
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('../spell-targeting.js').SpellTargetHits[]} perTarget
   * @param {boolean} quiet
   * @returns {Promise<{ drainModifier: number, outcomes: import('../resist-summary.js').SpellResistOutcome[] }>}
   */
  static async _resolveDirect(caster, spell, force, perTarget, quiet) {
    const resisted = await Promise.all(
      perTarget.map(async ({ target, hits }) => ({
        target,
        netHits: await CombatSpellFlow._requestDirectResist(
          caster,
          spell,
          hits,
          force,
          target
        ),
      }))
    );

    let drainModifier = 0;
    for (const { target, netHits } of resisted) {
      const applied = await CombatSpellFlow._applyDirectResult(
        caster,
        spell,
        force,
        target,
        netHits,
        quiet
      );
      drainModifier = Math.max(drainModifier, applied);
    }
    return {
      drainModifier,
      outcomes: resisted.map(({ target, netHits }) =>
        resistOutcome(target, netHits)
      ),
    };
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('../spell-targeting.js').SpellTargetHits[]} perTarget
   * @returns {Promise<void>}
   */
  static async _resolveIndirect(caster, spell, force, perTarget) {
    const spellSnapshot = spell.toObject();
    for (const { target, hits } of perTarget) {
      await emitSystemSocket({
        action: 'triggerIndirectSpellDefense',
        payload: {
          defenderUuid: target.uuid,
          casterUuid: caster.uuid,
          spell: spellSnapshot,
          castingHits: hits,
          force,
        },
      });
    }
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @returns {Promise<number>}
   */
  static _requestDirectResist(caster, spell, castingHits, force, target) {
    const defenderUuid = target.uuid;
    const isMana = spell.system?.type === 'MANA';

    return awaitOpposedSocketResponse({
      triggerAction: 'triggerDirectSpellResist',
      triggerPayload: {
        defenderUuid,
        casterUuid: caster.uuid,
        spellName: spell.name,
        castingHits,
        force,
        isMana,
      },
      matchAction: 'directSpellResisted',
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
          castingHits -
            (await rollFallbackSpellResist(
              target,
              directSpellResistAttribute(isMana)
            ))
        ),
    });
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @param {number} netHits
   * @param {boolean} quiet
   * @returns {Promise<number>}
   */
  static async _applyDirectResult(
    caster,
    spell,
    force,
    target,
    netHits,
    quiet
  ) {
    if (netHits < 1) {
      if (quiet) return 0;
      await ApplyDamageFlow.sendCombatSummary(
        caster.name,
        target.name,
        'spellNoEffect',
        { spell: spell.name }
      );
      return 0;
    }

    const appliedHits = await openDirectSpellAllocationDialog(
      spell.name,
      force,
      netHits,
      target.name ?? ''
    );

    const isPhysical = isPhysicalDamageType(spell.system?.damageType);
    const effects = getSpellEffectData(spell);
    await emitSystemSocket({
      action: 'applyDirectSpellDamage',
      payload: {
        defenderUuid: target.uuid,
        casterUuid: caster.uuid,
        spellName: spell.name,
        damage: force + appliedHits,
        isPhysical,
        effects,
        quiet,
      },
    });

    return appliedHits;
  }
}
