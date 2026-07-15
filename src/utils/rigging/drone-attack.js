import { isRangedWeapon } from '@models/index';
import {
  createDialogParameters,
  dialogActions,
  getInt,
  localize,
  renderTemplate,
} from '../dialog/dialogutility';
import {
  depleteAmmo,
  getFireModeParams,
  wireFireModeControls,
} from '../dialog/actions/attack';
import { reloadWeapon } from '../weapons.js';
import { emitDefenseTrigger } from '@flows/defense-flow.js';
import { resolveFinalSuccessesAndEmit } from '@utils/rolls/roll-edge-decision.js';
import {
  ControlModes,
  DroneActions,
  controllingActor,
  getRiggerLookup,
  resolveRigger,
} from './drone-pool';
import {
  buildControlModeOptions,
  resolveDialogPool,
  wireDroneDialog,
} from './drone-roll-dialog';

/** @returns {string} */
export function droneAttackTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/drone-attack-dialog.hbs';
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@models/index').SR4Weapon} weapon
 * @returns {Promise<void>}
 */
export async function openDroneAttackDialog(vehicle, weapon) {
  const rigger = await resolveRigger(vehicle);
  const storedMode = /** @type {any} */ (vehicle.system)?.controlMode;
  if (storedMode !== ControlModes.AUTONOMOUS && !rigger)
    ui.notifications?.warn(localize('sr4.vehicle.noRigger'));

  const ranged = isRangedWeapon(weapon);
  const ammoTracking =
    ranged &&
    /** @type {boolean} */ (game.settings.get('shadowrun4e', 'ammoTracking'));

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
        callback: async () => reloadWeapon(vehicle, weapon.id),
      },
    });
    return;
  }

  const params = createDialogParameters(rigger ?? vehicle, 0, weapon);
  const fireModeParams = ranged
    ? getFireModeParams(weapon)
    : {
        showFireModeUI: false,
        hasBurstModes: false,
        fireModes: [],
        shotOptions: [],
      };
  const rangedAmmo =
    ranged && weapon.system.maxAmmo > 0
      ? {
          currentAmmo: weapon.system.currentAmmo,
          maxAmmo: weapon.system.maxAmmo,
          ammoInsufficient:
            !fireModeParams.showFireModeUI && weapon.system.currentAmmo < 1,
        }
      : {};

  const content = await renderTemplate(droneAttackTemplatePath(), {
    ...params,
    ...fireModeParams,
    ...rangedAmmo,
    controlModes: buildControlModeOptions(vehicle, rigger),
  });

  const rollLabel = `${localize('sr4.vehicle.actions.attack')}: ${weapon.name}`;
  const lookup = getRiggerLookup(vehicle);
  const resolve = (html) =>
    resolveDialogPool(html, vehicle, rigger, DroneActions.ATTACK, { lookup });

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${rollLabel} — ${vehicle.name}` },
    content,
    ok: {
      label: localize('sr4.roll.rollButton'),
      callback: async (_event, button) => {
        const html = /** @type {HTMLElement} */ (button.closest('dialog'));
        const resolved = resolve(html);
        const actor = controllingActor(vehicle, rigger, resolved.mode);
        const shots = getInt(html, 'shotCount') || 1;
        const wideDefenseMalus = getInt(html, 'wideDefenseMalus');
        const burstDamageBonus = getInt(html, 'burstBonus');
        const rollResult = await dialogActions(
          html,
          actor,
          rollLabel,
          resolved.pool,
          weapon,
          { edgeAvailableOverride: false }
        );
        if (ammoTracking) await depleteAmmo(vehicle, weapon, shots);
        return {
          ...rollResult,
          mode: resolved.mode,
          wideDefenseMalus,
          burstDamageBonus,
        };
      },
    },
    render: (event) => {
      const html = event.target.element;
      const update = wireDroneDialog(html, params.maxEdge, [
        {
          action: 'ok',
          label: localize('sr4.roll.rollButton'),
          resolve: () => resolve(html),
        },
      ]);
      if (fireModeParams.showFireModeUI)
        wireFireModeControls(
          html,
          weapon,
          fireModeParams,
          ammoTracking,
          update
        );
    },
  });

  if (!result) return;
  const actor = controllingActor(vehicle, rigger, result.mode);
  await resolveFinalSuccessesAndEmit(actor, result, (finalSuccesses) =>
    emitDefenseTrigger(
      vehicle,
      weapon,
      finalSuccesses,
      result.wideDefenseMalus ?? 0,
      result.burstDamageBonus ?? 0
    )
  );
}
