import { TEMPLATES, renderTemplate } from '@utils/templates';
import { isRangedWeapon } from '@models/index';
import {
  createRollDialog,
  localize,
  createDialogParameters,
  dialogActions,
  getInt,
  getSkillDicePool,
  splitDiceAcrossTargets,
  promptDialog,
} from '@utils/dialog';
import { openMeleeAttackDialog } from './melee';
import { reloadWeapon, depleteAmmo } from '../weapons.js';
import {
  emitDefenseTrigger,
  emitDefenseTriggerForTarget,
} from '../flow/defense-flow.js';
import { resolveFinalSuccessesAndEmit } from '@utils/rolls/roll-edge-decision.js';
import { getValidTargetActors } from '@utils/game/game.js';
import {
  getFireModeParams,
  selectFireModeForSplit,
  wireFireModeControls,
} from './fire-modes.js';

/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {SR4Weapon} weapon
 * @param {Record<string, unknown> & { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed?: boolean, messageId: string | null } | null | undefined} result
 * @param {{ targetUuid?: string, modifiers?: import('../flow/defense-flow.js').CombatModifiers }} [options]
 * @returns {Promise<void>}
 */
async function resolveAttackAndEmitDefense(
  actor,
  weapon,
  result,
  { targetUuid, modifiers } = {}
) {
  await resolveFinalSuccessesAndEmit(actor, result, (finalSuccesses) =>
    targetUuid
      ? emitDefenseTriggerForTarget(
          actor,
          weapon,
          finalSuccesses,
          targetUuid,
          modifiers
        )
      : emitDefenseTrigger(actor, weapon, finalSuccesses, modifiers)
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {SR4Weapon} weapon
 * @returns {Promise<void>}
 */
export async function handleAttackRoll(actor, skillName, weapon) {
  if (isRangedWeapon(weapon)) {
    await openRangedAttackDialog(actor, skillName, weapon);
  } else {
    await openMeleeAttackDialog(actor, skillName, weapon);
  }
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number} dice
 * @param {SR4Weapon} weapon
 * @param {{
 *   titleSuffix?: string,
 *   templatePath: string,
 *   templateContext?: Record<string, unknown>,
 *   onRender?: (html: HTMLElement, updateLabel: () => void) => void,
 *   onRoll?: (dialog: HTMLElement) => unknown,
 *   targetUuid?: string,
 *   edgePayment?: import('@utils/dialog').EdgePayment | null,
 *   modifiers?: import('../flow/defense-flow.js').CombatModifiers | ((result: any) => import('../flow/defense-flow.js').CombatModifiers),
 * }} options
 * @returns {Promise<void>}
 */
async function rollRangedAttack(
  actor,
  skillName,
  dice,
  weapon,
  {
    titleSuffix = '',
    templatePath,
    templateContext = {},
    onRender,
    onRoll,
    targetUuid,
    edgePayment = null,
    modifiers,
  }
) {
  const params = createDialogParameters(actor, dice, weapon, {
    isAttack: true,
    edgePayment,
  });
  const skill = actor.getSkill(skillName);
  const content = await renderTemplate(templatePath, {
    ...params,
    skillName,
    ...templateContext,
  });
  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)}${titleSuffix}`,
    content,
    dice,
    onRender,
    onRoll:
      onRoll ??
      ((dialog) =>
        dialogActions(dialog, actor, skillName, dice, weapon, {
          edgeAvailableOverride: false,
          edgePayment,
        })),
  });
  await resolveAttackAndEmitDefense(actor, weapon, result, {
    targetUuid,
    modifiers:
      (typeof modifiers === 'function' ? modifiers(result) : modifiers) ?? {},
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {SR4Weapon & { type: 'Ranged Weapon', system: import('@models/index').SR4RangedWeaponSystem }} weapon
 * @returns {Promise<void>}
 */
async function openRangedAttackDialog(actor, skillName, weapon) {
  const ammoTracking = /** @type {boolean} */ (
    game.settings.get('shadowrun4e', 'ammoTracking')
  );

  if (
    ammoTracking &&
    weapon.system.maxAmmo > 0 &&
    weapon.system.currentAmmo === 0
  ) {
    await promptDialog({
      window: { title: localize('sr4.weapon.emptyTitle') },
      content: `<p>${localize('sr4.weapon.emptyHint')}</p>`,
      ok: {
        label: localize('sr4.weapon.reload'),
        callback: async () => reloadWeapon(actor, weapon.id),
      },
    });
    return;
  }

  const dice = getSkillDicePool(actor, skillName);
  if (dice === undefined) return;

  const targets = getValidTargetActors();
  if (targets.length > 1) {
    const fireMode = await selectFireModeForSplit(weapon);
    if (!fireMode) return;

    const effectiveDice = Math.max(1, dice - fireMode.recoil);
    const allocations = await splitDiceAcrossTargets(
      actor,
      effectiveDice,
      targets,
      weapon.name
    );
    if (!allocations) return;

    if (ammoTracking) await depleteAmmo(actor, weapon, fireMode.shots);

    for (const {
      target,
      targetUuid,
      allocatedDice,
      edgePayment,
    } of allocations) {
      await rollRangedAttack(actor, skillName, allocatedDice, weapon, {
        titleSuffix: ` → ${target?.name ?? ''}`,
        templatePath: TEMPLATES.ui.dialogs.roll,
        targetUuid,
        edgePayment,
        modifiers: {
          wideDefenseMalus: fireMode.wideDefenseMalus,
          burstDamageBonus: fireMode.burstDamageBonus,
        },
      });
    }
    return;
  }

  const fireModeParams = getFireModeParams(weapon);
  const skill = actor.getSkill(skillName);

  const rangedAmmo =
    weapon.system.maxAmmo > 0
      ? {
          currentAmmo: weapon.system.currentAmmo,
          maxAmmo: weapon.system.maxAmmo,
          ammoInsufficient:
            !fireModeParams.showFireModeUI && weapon.system.currentAmmo < 1,
        }
      : {};

  await rollRangedAttack(actor, skillName, dice, weapon, {
    titleSuffix: ` ${skill.system.specialization ?? ''}`,
    templatePath: TEMPLATES.combat.attackRollDialog,
    templateContext: { ...fireModeParams, ...rangedAmmo },
    onRender: fireModeParams.showFireModeUI
      ? (html, updateLabel) =>
          wireFireModeControls(
            html,
            weapon,
            fireModeParams,
            ammoTracking,
            updateLabel
          )
      : undefined,
    onRoll: async (dialog) => {
      const shots = getInt(dialog, 'shotCount') || 1;
      const wideDefenseMalus = getInt(dialog, 'wideDefenseMalus');
      const burstDamageBonus = getInt(dialog, 'burstBonus');
      const result = await dialogActions(
        dialog,
        actor,
        skillName,
        dice,
        weapon,
        {
          edgeAvailableOverride: false,
        }
      );
      if (ammoTracking) await depleteAmmo(actor, weapon, shots);
      return { ...result, wideDefenseMalus, burstDamageBonus };
    },
    modifiers: (result) => ({
      wideDefenseMalus: result.wideDefenseMalus,
      burstDamageBonus: result.burstDamageBonus,
    }),
  });
}
