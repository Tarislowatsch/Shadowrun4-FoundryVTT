import {
  awaitOpposedSocketResponse,
  emitSystemSocket,
  getValidTargetActorsOrWarn,
} from '@utils/index';
import { ApplyDamageFlow } from '@domains/combat/flow/apply-damage-flow.js';
import { isPhysicalDamageType } from '@models/items/weapons.model.js';
import { openDirectSpellAllocationDialog } from '../dialogs/combat-spell.js';
import { getSpellEffectData } from './apply-effects-flow';

export class CombatSpellFlow {
  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} [preresolvedTargets]
   * @returns {Promise<number>}
   */
  static async start(caster, spell, castingHits, force, preresolvedTargets) {
    const combatType = spell.system?.combatType ?? 'DIRECT';

    if (combatType === 'DIRECT') {
      return CombatSpellFlow._handleDirect(
        caster,
        spell,
        castingHits,
        force,
        preresolvedTargets
      );
    }
    return CombatSpellFlow._handleIndirect(
      caster,
      spell,
      castingHits,
      force,
      preresolvedTargets
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} [preresolvedTargets]
   * @returns {Promise<number>}
   */
  static async _handleDirect(
    caster,
    spell,
    castingHits,
    force,
    preresolvedTargets
  ) {
    const targets = getValidTargetActorsOrWarn(spell.name, preresolvedTargets);
    if (targets.length === 0) return 0;

    let maxAppliedHits = 0;
    for (const target of targets) {
      if (!target.uuid) continue;
      const applied = await CombatSpellFlow._directSpellVsTarget(
        caster,
        spell,
        castingHits,
        force,
        target
      );
      maxAppliedHits = Math.max(maxAppliedHits, applied);
    }
    return maxAppliedHits;
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor} target
   * @returns {Promise<number>}
   */
  static async _directSpellVsTarget(caster, spell, castingHits, force, target) {
    const defenderUuid = target.uuid;
    const isMana = spell.system?.type === 'MANA';

    const netHits = await awaitOpposedSocketResponse({
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
      fallback: 0,
    });

    if (netHits < 1) {
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
        defenderUuid,
        casterUuid: caster.uuid,
        spellName: spell.name,
        damage: force + appliedHits,
        isPhysical,
        effects,
      },
    });

    return appliedHits;
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @param {import('@documents/index').SR4Actor[]} [preresolvedTargets]
   * @returns {Promise<number>}
   */
  static async _handleIndirect(
    caster,
    spell,
    castingHits,
    force,
    preresolvedTargets
  ) {
    const targets = getValidTargetActorsOrWarn(spell.name, preresolvedTargets);
    if (targets.length === 0) return 0;

    const spellSnapshot = spell.toObject();
    for (const target of targets) {
      const defenderUuid = target.uuid;
      if (!defenderUuid) continue;
      await emitSystemSocket({
        action: 'triggerIndirectSpellDefense',
        payload: {
          defenderUuid,
          casterUuid: caster.uuid,
          spell: spellSnapshot,
          castingHits,
          force,
        },
      });
    }

    return 0;
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {{ target: import('@documents/index').SR4Actor, hits: number }[]} perTargetHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async startPerTarget(caster, spell, perTargetHits, force) {
    const combatType = spell.system?.combatType ?? 'DIRECT';

    if (combatType === 'DIRECT') {
      let maxAppliedHits = 0;
      for (const { target, hits } of perTargetHits) {
        if (!target.uuid) continue;
        const applied = await CombatSpellFlow._directSpellVsTarget(
          caster,
          spell,
          hits,
          force,
          target
        );
        maxAppliedHits = Math.max(maxAppliedHits, applied);
      }
      return maxAppliedHits;
    }

    const spellSnapshot = spell.toObject();
    for (const { target, hits } of perTargetHits) {
      const defenderUuid = target.uuid;
      if (!defenderUuid) continue;
      await emitSystemSocket({
        action: 'triggerIndirectSpellDefense',
        payload: {
          defenderUuid,
          casterUuid: caster.uuid,
          spell: spellSnapshot,
          castingHits: hits,
          force,
        },
      });
    }
    return 0;
  }
}
