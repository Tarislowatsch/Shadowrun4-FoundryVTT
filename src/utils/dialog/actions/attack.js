import { isRangedWeapon, Shootingmodes } from '@models/index';
import {
  attackTemplatePath,
  createDialogParameters,
  createRollDialog,
  dialogActions,
  getInt,
  getSkillDicePool,
  localize,
  renderTemplate,
} from '../dialogutility';
import { openMeleeAttackDialog } from './melee';
import { reloadWeapon } from '../../weapons.js';
import {
  emitDefenseTrigger,
  emitDefenseTriggerForTarget,
} from '@flows/defense-flow.js';
import { awaitEdgeDecision } from '@utils/rolls/roll-edge-decision.js';
import { openDicePoolSplitDialog } from '../dice-pool-split.js';
import { getValidTargetActors } from '@utils/game/game.js';

/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/** @type {Record<string, number[]>} */
const SHOTS_BY_MODE = {
  [Shootingmodes.SINGLE_SHOT]: [1],
  [Shootingmodes.SEMI_AUTOMATIC]: [1],
  [Shootingmodes.BURST_FIRE]: [3],
  [Shootingmodes.FULL_AUTO]: [6, 10],
};

/** @type {Record<string, string[]>} */
const MODES_BY_WEAPON_MODE = {
  SINGLE_SHOT: [Shootingmodes.SINGLE_SHOT],
  SEMI_AUTOMATIC: [Shootingmodes.SEMI_AUTOMATIC],
  BURST_FIRE: [Shootingmodes.BURST_FIRE],
  FULL_AUTO: [Shootingmodes.FULL_AUTO],
  SEMI_BURST: [Shootingmodes.SEMI_AUTOMATIC, Shootingmodes.BURST_FIRE],
  SEMI_BURST_FULL_AUTO: [
    Shootingmodes.SEMI_AUTOMATIC,
    Shootingmodes.BURST_FIRE,
    Shootingmodes.FULL_AUTO,
  ],
};

const SIMPLE_MODES = new Set([
  Shootingmodes.SINGLE_SHOT,
  Shootingmodes.SEMI_AUTOMATIC,
]);

/** @type {Record<number, {narrow: number, wide: number}>} */
const BURST_MODIFIERS = {
  3: { narrow: 2, wide: 2 },
  6: { narrow: 5, wide: 5 },
  10: { narrow: 9, wide: 9 },
};

const MODES_WITH_BURST_OPTION = new Set([
  Shootingmodes.BURST_FIRE,
  Shootingmodes.FULL_AUTO,
]);

/**
 * @param {SR4Weapon} weapon
 * @returns {{ showFireModeUI: boolean, showModeRadios?: boolean, hasBurstModes: boolean, fireModes: string[], shotOptions: number[] }}
 */
function getFireModeParams(weapon) {
  const weaponMode = weapon.system.mode;
  const modes = MODES_BY_WEAPON_MODE[weaponMode] ?? [];
  const hasComplex = modes.some((m) => !SIMPLE_MODES.has(m));

  if (!hasComplex) {
    return {
      showFireModeUI: false,
      hasBurstModes: false,
      fireModes: [],
      shotOptions: [],
    };
  }

  const firstMode = modes[0];
  return {
    showFireModeUI: true,
    showModeRadios: modes.length > 1,
    hasBurstModes: modes.some((m) => MODES_WITH_BURST_OPTION.has(m)),
    fireModes: modes,
    shotOptions: SHOTS_BY_MODE[firstMode] ?? [1],
  };
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {SR4Weapon & { type: 'Ranged Weapon', system: import('@models/index').SR4RangedWeaponSystem }} weapon
 * @param {number} shots
 * @returns {Promise<void>}
 */
async function depleteAmmo(actor, weapon, shots) {
  /** @type {Record<string, Record<string, unknown>>} */
  const byId = {};
  if (weapon.system.maxAmmo > 0) {
    byId[weapon.id] = {
      'system.currentAmmo': Math.max(0, weapon.system.currentAmmo - shots),
    };
  }
  if (weapon.system.loadedAmmoId) {
    const ammo = actor.items?.get(weapon.system.loadedAmmoId);
    if (ammo) {
      const newQty = Math.max(0, ammo.system.quantity - shots);
      byId[ammo.id] = { 'system.quantity': newQty };
      if (newQty === 0) {
        byId[weapon.id] ??= {};
        byId[weapon.id]['system.loadedAmmoId'] = '';
      }
    }
  }
  const batch = Object.entries(byId).map(([id, data]) => ({
    _id: id,
    ...data,
  }));
  if (batch.length) await actor.updateEmbeddedDocuments('Item', batch);
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
 * @param {string} targetId
 * @param {string} targetName
 * @param {number} [wideDefenseMalus]
 * @param {number} [burstDamageBonus]
 * @returns {Promise<void>}
 */
async function rollAttackForTarget(
  actor,
  skillName,
  dice,
  weapon,
  targetId,
  targetName,
  wideDefenseMalus = 0,
  burstDamageBonus = 0
) {
  const params = createDialogParameters(actor, dice, weapon);
  params.malus -= actor.system.modifiers.attackModifier ?? 0;
  const skill = actor.getSkill(skillName);
  const content = await renderTemplate(
    'systems/shadowrun4e/templates/dicerolls/roll-dialog.hbs',
    { ...params, skillName }
  );
  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} → ${targetName}`,
    content,
    dice,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, dice, weapon, {
        edgeAvailableOverride: false,
      }),
  });
  if (!result || result.isGlitch) return;

  let finalSuccesses = result.successes;
  if (!result.edgeUsed) {
    finalSuccesses = await awaitEdgeDecision({
      messageId: result.messageId,
      actor,
      rollResult: {
        successes: result.successes,
        rolledDice: result.rolledDice,
        isGlitch: result.isGlitch,
      },
    });
  }
  if (finalSuccesses > 0) {
    emitDefenseTriggerForTarget(
      actor,
      weapon,
      finalSuccesses,
      targetId,
      wideDefenseMalus,
      burstDamageBonus
    );
  }
}

/**
 * @param {SR4Weapon} weapon
 * @returns {Promise<{ shots: number, recoil: number, wideDefenseMalus: number, burstDamageBonus: number } | null>}
 */
async function selectFireModeForSplit(weapon) {
  const fireModeParams = getFireModeParams(weapon);
  if (!fireModeParams.showFireModeUI) {
    return { shots: 1, recoil: 0, wideDefenseMalus: 0, burstDamageBonus: 0 };
  }

  const rc = weapon.system.rc ?? 0;
  const modes = fireModeParams.fireModes;
  const modeLabels = modes
    .map(
      (m) =>
        `<label><input type="radio" name="fireMode" value="${m}" ${m === modes[0] ? 'checked' : ''}/> ${localize('sr4.roll.' + m)}</label>`
    )
    .join('');
  const content = `<form class="fire-mode-select"><div class="form-group">${modeLabels}</div></form>`;

  const selectedMode = await foundry.applications.api.DialogV2.prompt({
    window: { title: localize('sr4.roll.splitPool') },
    content,
    ok: {
      label: localize('sr4.roll.rollButton'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        return (
          /** @type {HTMLInputElement|null} */ (
            dialog?.querySelector('input[name="fireMode"]:checked')
          )?.value ?? modes[0]
        );
      },
    },
    cancel: { label: localize('sr4.cancel'), callback: () => null },
  });

  if (!selectedMode) return null;

  const shots = (SHOTS_BY_MODE[selectedMode] ?? [1])[0];
  const recoil = Math.max(0, shots - 1 - rc);
  const isBurst = MODES_WITH_BURST_OPTION.has(selectedMode);
  const mods = BURST_MODIFIERS[shots] ?? { narrow: 0, wide: 0 };

  return {
    shots,
    recoil,
    wideDefenseMalus: isBurst ? mods.wide : 0,
    burstDamageBonus: 0,
  };
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
    await foundry.applications.api.DialogV2.prompt({
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
    const splitTargets = targets.map((t) => ({
      id: /** @type {any} */ (t).id ?? '',
      name: t.name,
    }));
    const allocations = await openDicePoolSplitDialog(
      effectiveDice,
      splitTargets,
      weapon.name
    );
    if (!allocations) return;

    if (ammoTracking) await depleteAmmo(actor, weapon, fireMode.shots);

    for (const { targetId, allocatedDice } of allocations) {
      const t = targets.find((a) => /** @type {any} */ (a).id === targetId);
      await rollAttackForTarget(
        actor,
        skillName,
        allocatedDice,
        weapon,
        targetId,
        t?.name ?? '',
        fireMode.wideDefenseMalus,
        fireMode.burstDamageBonus
      );
    }
    return;
  }

  const params = createDialogParameters(actor, dice, weapon);
  params.malus -= actor.system.modifiers.attackModifier ?? 0;
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

  const content = await renderTemplate(attackTemplatePath(), {
    ...params,
    ...fireModeParams,
    ...rangedAmmo,
  });

  const result = await createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize(skill.system.label)} ${skill.system.specialization ?? ''}`,
    content,
    dice,
    onRender: fireModeParams.showFireModeUI
      ? (html, updateLabel) => {
          const rc = weapon.system.rc ?? 0;

          const getSelectedMode = () =>
            /** @type {HTMLInputElement|null} */ (
              html.querySelector('input[name="fireMode"]:checked')
            )?.value ?? fireModeParams.fireModes[0];

          /**
           * @param {string} modeKey
           * @param {number} shots
           */
          const updateBurstModifiers = (modeKey, shots) => {
            const isBurst = MODES_WITH_BURST_OPTION.has(modeKey);
            const selector = /** @type {HTMLElement|null} */ (
              html.querySelector('#burstModeSelector')
            );
            if (selector) selector.hidden = !isBurst;
            const bonusEl = /** @type {HTMLInputElement|null} */ (
              html.querySelector('#burstBonus')
            );
            const malusEl = /** @type {HTMLInputElement|null} */ (
              html.querySelector('#wideDefenseMalus')
            );
            if (!isBurst) {
              if (bonusEl) bonusEl.value = '0';
              if (malusEl) malusEl.value = '0';
              updateLabel();
              return;
            }
            const isNarrow =
              /** @type {HTMLInputElement|null} */ (
                html.querySelector('input[name="burstMode"]:checked')
              )?.value !== 'wide';
            const mods = BURST_MODIFIERS[shots] ?? { narrow: 0, wide: 0 };
            const missing = ammoTracking
              ? Math.max(0, shots - weapon.system.currentAmmo)
              : 0;
            const narrowBonus = Math.max(0, mods.narrow - missing);
            const wideMalus = Math.max(0, mods.wide - missing);
            if (bonusEl) bonusEl.value = String(isNarrow ? narrowBonus : 0);
            if (malusEl) malusEl.value = String(isNarrow ? 0 : wideMalus);
            updateLabel();
          };

          const updateAmmoDisplay = (/** @type {number} */ shots) => {
            const el = /** @type {HTMLElement|null} */ (
              html.querySelector('#ammoDisplay')
            );
            if (!el) return;
            el.style.color =
              weapon.system.currentAmmo < shots ? 'var(--sr4-red)' : '';
          };

          const updateRecoil = () => {
            const shots = getInt(html, 'shotCount');
            const recoil = Math.max(0, shots - 1 - rc);
            const display = html.querySelector('#recoilDisplay');
            const hidden = html.querySelector('#recoilMalus');
            if (display) display.textContent = String(recoil);
            if (hidden) hidden.value = String(recoil);
            updateBurstModifiers(getSelectedMode(), shots);
            updateAmmoDisplay(shots);
          };

          const updateShotOptions = (modeKey) => {
            const shots = SHOTS_BY_MODE[modeKey] ?? [1];
            const select = /** @type {HTMLSelectElement|null} */ (
              html.querySelector('#shotCount')
            );
            if (!select) return;
            select.innerHTML = shots
              .map((s) => `<option value="${s}">${s}</option>`)
              .join('');
            updateRecoil();
          };

          html
            .querySelectorAll('input[name="fireMode"]')
            .forEach((el) =>
              el.addEventListener('change', (e) =>
                updateShotOptions(
                  /** @type {HTMLInputElement} */ (e.target).value
                )
              )
            );
          html
            .querySelectorAll('input[name="burstMode"]')
            .forEach((el) =>
              el.addEventListener('change', () =>
                updateBurstModifiers(
                  getSelectedMode(),
                  getInt(html, 'shotCount')
                )
              )
            );
          html
            .querySelector('#shotCount')
            ?.addEventListener('change', updateRecoil);

          updateShotOptions(getSelectedMode());
        }
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
  });

  if (!result || result.isGlitch) return;

  let finalSuccesses = result.successes;
  if (!result.edgeUsed) {
    finalSuccesses = await awaitEdgeDecision({
      messageId: result.messageId,
      actor,
      rollResult: {
        successes: result.successes,
        rolledDice: result.rolledDice,
        isGlitch: result.isGlitch,
      },
    });
  }
  if (finalSuccesses > 0) {
    emitDefenseTrigger(
      actor,
      weapon,
      finalSuccesses,
      result.wideDefenseMalus,
      result.burstDamageBonus
    );
  }
}
