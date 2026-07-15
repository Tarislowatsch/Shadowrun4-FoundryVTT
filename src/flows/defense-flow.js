import {
  getGame,
  getValidTargetActors,
  openDefenseDialog,
  openSoakDialog,
} from '@utils/index';
import { resolveEdgeForRoll } from '@utils/rolls/roll-edge-decision.js';
import { openDroneDefenseDialog } from '@utils/rigging/drone-defense.js';
import {
  isPhysicalDamageType,
  getElementResistance,
  computeElementArmorRules,
  buildElementOnApply,
} from '@models/index';
import { ApplyDamageFlow } from './apply-damage-flow';

/**
 * @param {import('@models/index').SR4Weapon} weapon
 * @returns {object}
 */
function buildWeaponSnapshot(weapon) {
  /** @type {any} */
  const sys = weapon.system;
  const base = weapon.toObject();
  return {
    ...base,
    system: {
      ...base.system,
      damage: sys.effectiveDamage ?? sys.damage,
      ap: sys.effectiveAP ?? sys.ap,
      damageType: sys.effectiveDamageType ?? sys.damageType,
      armorType: sys.effectiveArmorType ?? sys.armorType,
      apHalf: sys.effectiveApHalf ?? false,
    },
  };
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} successes
 * @param {number} [wideDefenseMalus]
 * @param {number} [burstDamageBonus]
 * @returns {void}
 */
export function emitDefenseTrigger(
  actor,
  weapon,
  successes,
  wideDefenseMalus = 0,
  burstDamageBonus = 0
) {
  if (!weapon?.type) return;

  const actorId = /** @type {any} */ (actor).id;
  const validTargets = getValidTargetActors();

  const weaponSnapshot = buildWeaponSnapshot(weapon);

  if (validTargets.length === 0) {
    if (
      getGame().settings.get('shadowrun4e', 'gmDefenderPicker') &&
      getGame().settings.get('shadowrun4e', 'combatDefenseWorkflow')
    ) {
      getGame().socket?.emit('system.shadowrun4e', {
        action: 'selectDefender',
        payload: {
          attackerId: actorId,
          successes,
          weapon: weaponSnapshot,
          wideDefenseMalus,
          burstDamageBonus,
        },
      });
    }
    return;
  }

  for (const target of validTargets) {
    const defenderId = /** @type {any} */ (target).id;
    if (!defenderId) continue;
    getGame().socket?.emit('system.shadowrun4e', {
      action: 'triggerDefense',
      payload: {
        defenderId,
        attackerId: actor.id,
        successes,
        weapon: weaponSnapshot,
        wideDefenseMalus,
        burstDamageBonus,
      },
    });
  }
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} successes
 * @param {string} targetId
 * @param {number} [wideDefenseMalus]
 * @param {number} [burstDamageBonus]
 * @returns {void}
 */
export function emitDefenseTriggerForTarget(
  actor,
  weapon,
  successes,
  targetId,
  wideDefenseMalus = 0,
  burstDamageBonus = 0
) {
  if (!weapon?.type) return;
  const weaponSnapshot = buildWeaponSnapshot(weapon);
  getGame().socket?.emit('system.shadowrun4e', {
    action: 'triggerDefense',
    payload: {
      defenderId: targetId,
      attackerId: /** @type {any} */ (actor).id,
      successes,
      weapon: weaponSnapshot,
      wideDefenseMalus,
      burstDamageBonus,
    },
  });
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@models/index').SR4Weapon} weapon
 * @returns {{ raw: number, ap: number | null, apHalf: boolean, effective: number }}
 */
function getArmorBreakdown(defender, weapon) {
  /** @type {import('@models/index').SR4BaseCharacterSystem} */
  const sys = /** @type {any} */ (defender).system;
  const raw =
    defender.type === 'vehicle'
      ? (sys.effectiveArmor ?? sys.armor ?? 0)
      : weapon.system.armorType === 'impact'
        ? (sys.armor?.impact ?? 0)
        : (sys.armor?.ballistic ?? 0);
  const apHalf = weapon.system.apHalf ?? false;
  const ap = apHalf ? null : (weapon.system.ap ?? 0);
  const effective = apHalf
    ? Math.max(Math.floor(raw / 2), 0)
    : Math.max(raw + (weapon.system.ap ?? 0), 0);
  return { raw, ap, apHalf, effective };
}

export class DefenseFlow {
  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {import('@documents/index').SR4Actor} attacker
   * @param {number} successes
   * @param {import('@models/index').SR4Weapon} weapon
   * @param {number} burstDamageBonus
   * @returns {Promise<void>}
   */
  static async _sendPotentialSummary(
    defender,
    attacker,
    successes,
    weapon,
    burstDamageBonus
  ) {
    if (successes < 1) return;
    const isPhysical = isPhysicalDamageType(weapon.system.damageType);
    const potentialDamage =
      weapon.system.damage + (successes - 1) + burstDamageBonus;
    await ApplyDamageFlow.sendCombatSummary(
      attacker.name,
      defender.name,
      'potential',
      { hits: successes, damage: potentialDamage, isPhysical }
    );
  }

  /**
   * @param {import('@documents/index').SR4Actor} defender
   * @param {string} attackerId
   * @param {number} successes
   * @param {import('@models/index').SR4Weapon} weapon
   * @param {number} [wideDefenseMalus]
   * @param {number} [burstDamageBonus]
   * @returns {Promise<void>}
   */
  static async start(
    defender,
    attackerId,
    successes,
    weapon,
    wideDefenseMalus = 0,
    burstDamageBonus = 0
  ) {
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const attacker = getGame().actors?.get(attackerId);
    if (!defender || !attacker) return;

    if (!getGame().settings.get('shadowrun4e', 'combatDefenseWorkflow')) {
      await DefenseFlow._sendPotentialSummary(
        defender,
        attacker,
        successes,
        weapon,
        burstDamageBonus
      );
      return;
    }

    const defenseResult =
      defender.type === 'vehicle'
        ? await openDroneDefenseDialog(
            defender,
            attacker,
            successes,
            weapon,
            wideDefenseMalus
          )
        : await openDefenseDialog(
            defender,
            attacker,
            successes,
            weapon,
            wideDefenseMalus
          );
    if (defenseResult === null || defenseResult.successes === null) {
      await DefenseFlow._sendPotentialSummary(
        defender,
        attacker,
        successes,
        weapon,
        burstDamageBonus
      );
      return;
    }

    const defenseHits = await resolveEdgeForRoll(
      defender,
      defenseResult,
      successes
    );

    const netSuccesses = Math.max(successes - defenseHits, 0);
    if (netSuccesses === 0) return;

    const baseDamage =
      weapon.system.damage + (netSuccesses - 1) + burstDamageBonus;
    const {
      raw: rawArmor,
      ap,
      apHalf,
      effective: effectiveArmor,
    } = getArmorBreakdown(defender, weapon);
    const dt = weapon.system.damageType;
    let isPhysical = isPhysicalDamageType(dt);
    if (isPhysical && baseDamage <= effectiveArmor) isPhysical = false;

    const elementResistance = getElementResistance(defender, dt);
    const elementRules = computeElementArmorRules(dt, rawArmor);
    const hint = elementRules.hint;
    const onApply = buildElementOnApply(dt, defender, netSuccesses);

    if (!getGame().settings.get('shadowrun4e', 'combatSoakWorkflow')) {
      await ApplyDamageFlow.sendDecisionMessage(
        defender,
        baseDamage,
        isPhysical,
        'combat',
        { hint, onApply }
      );
      return;
    }

    const soakResult = await openSoakDialog(
      defender,
      baseDamage,
      isPhysical,
      effectiveArmor,
      { rawArmor, ap, apHalf, elementResistance }
    );
    if (!soakResult) return;

    const soakHits = await resolveEdgeForRoll(
      defender,
      { ...soakResult, successes: soakResult.hits },
      baseDamage
    );

    const finalDamage = Math.max(baseDamage - soakHits, 0);
    await ApplyDamageFlow.sendCombatSummary(
      attacker.name,
      defender.name,
      'result',
      {
        base: baseDamage,
        soaked: soakHits,
        final: finalDamage,
        isPhysical,
      }
    );
    if (finalDamage === 0) {
      await ApplyDamageFlow.applyAndSend(0, isPhysical, defender, 'combat');
      return;
    }

    await ApplyDamageFlow.sendDecisionMessage(
      defender,
      finalDamage,
      isPhysical,
      'combat',
      { hint, onApply }
    );
  }
}
