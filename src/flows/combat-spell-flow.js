import {
  awaitOpposedSocketResponse,
  getGame,
  getValidTargetActorsOrWarn,
} from '@utils/index.js';
import { openDirectSpellAllocationDialog } from '@utils/dialog/magic/combat-spell.js';
import { getSpellEffectData } from './apply-effects-flow';

export class CombatSpellFlow {
  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async start(caster, spell, castingHits, force) {
    if (!getGame().settings.get('shadowrun4e', 'spellWorkflow')) return 0;

    const combatType = spell.system?.combatType ?? 'DIRECT';

    if (combatType === 'DIRECT') {
      return CombatSpellFlow._handleDirect(caster, spell, castingHits, force);
    }
    return CombatSpellFlow._handleIndirect(caster, spell, castingHits, force);
  }

  /**
   * @param {import('@documents/index').SR4Actor} caster
   * @param {import('@models/index').SR4Spell} spell
   * @param {number} castingHits
   * @param {number} force
   * @returns {Promise<number>}
   */
  static async _handleDirect(caster, spell, castingHits, force) {
    const targets = getValidTargetActorsOrWarn(spell.name);
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
      ui?.notifications?.info(
        `${spell.name}: ${getGame().i18n?.localize('sr4.spell.noEffect')}`
      );
      return 0;
    }

    const appliedHits = await openDirectSpellAllocationDialog(
      spell.name,
      force,
      netHits,
      target.name ?? ''
    );

    const isPhysical = spell.system?.damageType !== 'STUN';
    const effects = getSpellEffectData(spell);
    getGame().socket?.emit('system.shadowrun4e', {
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
   * @returns {Promise<number>}
   */
  static async _handleIndirect(caster, spell, castingHits, force) {
    const targets = getValidTargetActorsOrWarn(spell.name);
    if (targets.length === 0) return 0;

    const spellSnapshot = spell.toObject();
    for (const target of targets) {
      const defenderUuid = target.uuid;
      if (!defenderUuid) continue;
      getGame().socket?.emit('system.shadowrun4e', {
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
    if (!getGame().settings.get('shadowrun4e', 'spellWorkflow')) return 0;
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
      getGame().socket?.emit('system.shadowrun4e', {
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
