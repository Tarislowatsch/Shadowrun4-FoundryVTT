import { emitSystemSocket, getGame, getValidTargetActors } from '@utils/index';
import { openDroneDefenseDialog } from '@domains/rigging/index.js';
import { openDefenseDialog, defaultDefensePool } from '../dialogs/defense.js';
import { openSoakDialog, defaultSoakPool } from '../dialogs/soak.js';
import {
  requestReactiveDecision,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
  resolveEdgeForRoll,
} from '@utils/rolls';
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
 * @typedef {object} CombatModifiers
 * @property {number} [wideDefenseMalus]
 * @property {number} [burstDamageBonus]
 */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {Array<import('@documents/index').SR4Actor>} targets
 * @returns {Promise<void>}
 */
async function reportMissedAttack(actor, targets) {
  if (targets.length === 0) {
    await ApplyDamageFlow.sendCombatSummary(actor.name, '', 'missed', {});
    return;
  }
  for (const target of targets) {
    await ApplyDamageFlow.sendCombatSummary(
      actor.name,
      target.name,
      'missed',
      {}
    );
  }
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} successes
 * @param {CombatModifiers} [modifiers]
 * @returns {Promise<void>}
 */
export async function emitDefenseTrigger(
  actor,
  weapon,
  successes,
  { wideDefenseMalus = 0, burstDamageBonus = 0 } = {}
) {
  if (!weapon?.type) return;

  const attackerUuid = /** @type {any} */ (actor).uuid;
  const validTargets = getValidTargetActors();

  if (successes < 1) {
    await reportMissedAttack(actor, validTargets);
    return;
  }

  const weaponSnapshot = buildWeaponSnapshot(weapon);

  if (validTargets.length === 0) {
    if (
      getGame().settings.get('shadowrun4e', 'gmDefenderPicker') &&
      getGame().settings.get('shadowrun4e', 'combatDefenseWorkflow')
    ) {
      await emitSystemSocket({
        action: 'selectDefender',
        payload: {
          attackerUuid,
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
    const defenderUuid = /** @type {any} */ (target).uuid;
    if (!defenderUuid) continue;
    await emitSystemSocket({
      action: 'triggerDefense',
      payload: {
        defenderUuid,
        attackerUuid,
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
 * @param {string} targetUuid
 * @param {CombatModifiers} [modifiers]
 * @returns {Promise<void>}
 */
export async function emitDefenseTriggerForTarget(
  actor,
  weapon,
  successes,
  targetUuid,
  { wideDefenseMalus = 0, burstDamageBonus = 0 } = {}
) {
  if (!weapon?.type) return;

  if (successes < 1) {
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const target = /** @type {any} */ (await fromUuid(targetUuid));
    await reportMissedAttack(actor, target ? [target] : []);
    return;
  }

  const weaponSnapshot = buildWeaponSnapshot(weapon);
  await emitSystemSocket({
    action: 'triggerDefense',
    payload: {
      defenderUuid: targetUuid,
      attackerUuid: /** @type {any} */ (actor).uuid,
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
   * @param {string} attackerUuid
   * @param {number} successes
   * @param {import('@models/index').SR4Weapon} weapon
   * @param {number} [wideDefenseMalus]
   * @param {number} [burstDamageBonus]
   * @returns {Promise<void>}
   */
  static async start(
    defender,
    attackerUuid,
    successes,
    weapon,
    wideDefenseMalus = 0,
    burstDamageBonus = 0
  ) {
    /** @type {import('@documents/index').SR4Actor | undefined} */
    const attacker = /** @type {any} */ (await fromUuid(attackerUuid));
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

    const isDrone = defender.type === 'vehicle';
    const defenseResult = await requestReactiveDecision({
      actor: defender,
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: !isDrone,
      standardPool: isDrone
        ? undefined
        : defaultDefensePool(defender, weapon, wideDefenseMalus),
      openDialog: () =>
        isDrone
          ? openDroneDefenseDialog(
              defender,
              attacker,
              successes,
              weapon,
              wideDefenseMalus
            )
          : openDefenseDialog(
              defender,
              attacker,
              successes,
              weapon,
              wideDefenseMalus
            ),
    });
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
    if (netSuccesses === 0) {
      await ApplyDamageFlow.sendCombatSummary(
        attacker.name,
        defender.name,
        'evaded',
        { hits: successes, defense: defenseHits }
      );
      return;
    }

    const {
      raw: rawArmor,
      ap,
      apHalf,
      effective: apEffectiveArmor,
    } = getArmorBreakdown(defender, weapon);
    const dt = weapon.system.damageType;
    const elementRules = computeElementArmorRules(dt, rawArmor);
    const baseDamage =
      weapon.system.damage +
      (netSuccesses - 1) +
      burstDamageBonus +
      elementRules.dvBonus;
    let effectiveArmor = apEffectiveArmor;
    if (elementRules.noArmor) {
      effectiveArmor = 0;
    } else if (dt === 'METAL') {
      effectiveArmor = elementRules.effectiveArmor;
    }
    let isPhysical = isPhysicalDamageType(dt);
    if (isPhysical && baseDamage <= effectiveArmor) isPhysical = false;

    const elementResistance = getElementResistance(defender, dt);
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

    const soakResult = await requestReactiveDecision({
      actor: defender,
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.SOAK,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      standardPool: defaultSoakPool(
        defender,
        effectiveArmor,
        elementResistance
      ),
      openDialog: () =>
        openSoakDialog(defender, baseDamage, isPhysical, effectiveArmor, {
          rawArmor,
          ap,
          apHalf,
          elementResistance,
        }),
    });
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
