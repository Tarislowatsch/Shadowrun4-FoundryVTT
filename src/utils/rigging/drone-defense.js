import {
  createDialogParameters,
  dialogActions,
  getChecked,
  localize,
  renderTemplate,
} from '../dialog/dialogutility';
import {
  DroneActions,
  buildRiggerSkillOptions,
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
export function droneDefenseTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/drone-defense-dialog.hbs';
}

/**
 * @param {import('@documents/index').SR4Actor} defender
 * @param {import('@documents/index').SR4Actor} attacker
 * @param {number} attackSuccesses
 * @param {import('@models/index').SR4Weapon} weapon
 * @param {number} [wideDefenseMalus]
 * @returns {Promise<{ successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null } | null>}
 */
export async function openDroneDefenseDialog(
  defender,
  attacker,
  attackSuccesses,
  weapon,
  wideDefenseMalus = 0
) {
  const rigger = await resolveRigger(defender);
  const isMelee = weapon.type.toLowerCase().includes('melee');
  const lookup = getRiggerLookup(defender);

  const riggerSkills = isMelee
    ? buildRiggerSkillOptions(rigger, DroneActions.MELEE_DEFENSE).map(
        (option) => ({ ...option, label: localize(option.label) })
      )
    : [];
  const params = createDialogParameters(rigger ?? defender);

  const content = await renderTemplate(droneDefenseTemplatePath(), {
    ...params,
    attackSuccesses,
    attackerName: attacker.name,
    weaponName: weapon.name,
    wideDefenseMalus,
    controlModes: buildControlModeOptions(defender, rigger),
    riggerSkills,
  });

  /** @param {HTMLElement} html @param {boolean} fullDefense */
  const resolvePool = (html, fullDefense) => {
    const action = fullDefense
      ? DroneActions.FULL_DEFENSE
      : isMelee
        ? DroneActions.MELEE_DEFENSE
        : DroneActions.RANGED_DEFENSE;
    const resolved = resolveDialogPool(html, defender, rigger, action, {
      melee: isMelee,
      lookup,
    });
    return {
      ...resolved,
      pool: Math.max(0, resolved.pool - wideDefenseMalus),
    };
  };

  const makeCallback = (fullDefense) => async (_event, button) => {
    const html = /** @type {HTMLElement} */ (button.closest('dialog'));
    const edgeUsed = getChecked(html, 'edge');
    const resolved = resolvePool(html, fullDefense);
    const actor = controllingActor(defender, rigger, resolved.mode);
    const rollLabel = localize(
      fullDefense
        ? 'sr4.vehicle.actions.fullDefense'
        : isMelee
          ? 'sr4.vehicle.actions.meleeDefense'
          : 'sr4.vehicle.actions.rangedDefense'
    );
    const { successes, isGlitch, rolledDice, messageId } = await dialogActions(
      html,
      actor,
      rollLabel,
      resolved.pool,
      weapon,
      { edgeAvailableOverride: false }
    );
    return { successes, isGlitch, rolledDice, edgeUsed, messageId };
  };

  return await foundry.applications.api.DialogV2.wait({
    window: {
      title: `${localize('sr4.defense.title')} — ${attacker.name} (${weapon.name})`,
    },
    content,
    render: (event) => {
      const html = event.target.element;
      wireDroneDialog(html, params.maxEdge, [
        {
          action: 'defend',
          label: localize('sr4.defense.defend'),
          resolve: () => resolvePool(html, false),
        },
        {
          action: 'fullDefense',
          label: localize('sr4.defense.fullDefense'),
          resolve: () => resolvePool(html, true),
        },
      ]);
    },
    buttons: [
      {
        label: localize('sr4.defense.defend'),
        action: 'defend',
        callback: makeCallback(false),
      },
      {
        label: localize('sr4.defense.fullDefense'),
        action: 'fullDefense',
        callback: makeCallback(true),
      },
    ],
  });
}
