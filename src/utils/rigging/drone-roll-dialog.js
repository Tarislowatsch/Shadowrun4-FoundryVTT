import {
  createDialogParameters,
  dialogActions,
  getChecked,
  getInt,
  localize,
  renderTemplate,
} from '../dialog/dialogutility';
import {
  ControlModes,
  buildRiggerSkillOptions,
  controllingActor,
  getRiggerLookup,
  resolveDronePool,
  resolveRigger,
} from './drone-pool';

/** @returns {string} */
export function droneRollTemplatePath() {
  return 'systems/shadowrun4e/templates/dicerolls/drone-roll-dialog.hbs';
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @returns {{ value: string, label: string, selected: boolean }[]}
 */
export function buildControlModeOptions(vehicle, rigger) {
  const current = resolveInitialMode(vehicle, rigger);
  const modes = rigger
    ? Object.values(ControlModes)
    : [ControlModes.AUTONOMOUS];
  return modes.map((mode) => ({
    value: mode,
    label: localize(`sr4.vehicle.controlModes.${mode}`),
    selected: mode === current,
  }));
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @returns {string}
 */
export function resolveInitialMode(vehicle, rigger) {
  const mode =
    /** @type {any} */ (vehicle.system)?.controlMode ?? ControlModes.AUTONOMOUS;
  return mode !== ControlModes.AUTONOMOUS && !rigger
    ? ControlModes.AUTONOMOUS
    : mode;
}

/**
 * @param {{ parts: { label: string, value: number }[], pool: number, warnings: string[] }} resolved
 * @returns {string}
 */
export function formatPoolBreakdown(resolved) {
  const sum = resolved.parts
    .map((part) => `${localize(part.label)} ${part.value}`)
    .join(' + ');
  const warnings = resolved.warnings.map((key) => localize(key)).join(' · ');
  return warnings ? `${sum} — ${warnings}` : sum;
}

/**
 * @param {HTMLElement} html
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {import('@documents/index').SR4Actor | null} rigger
 * @param {string} action
 * @param {{ melee?: boolean, lookup?: Record<string, string> }} [options]
 * @returns {{ mode: string, pool: number, parts: { label: string, value: number }[], warnings: string[] }}
 */
export function resolveDialogPool(html, vehicle, rigger, action, options = {}) {
  const mode =
    /** @type {HTMLSelectElement|null} */ (html.querySelector('#controlMode'))
      ?.value ?? ControlModes.AUTONOMOUS;
  const skillOverride =
    mode !== ControlModes.AUTONOMOUS
      ? /** @type {HTMLSelectElement|null} */ (
          html.querySelector('#riggerSkill')
        )?.value
      : undefined;
  const resolved = resolveDronePool(vehicle, rigger, mode, action, {
    ...options,
    skillOverride,
  });
  return { mode, ...resolved };
}

/**
 * @typedef {{ mode: string, pool: number, parts: { label: string, value: number }[], warnings: string[] }} ResolvedPool
 */

/**
 * @param {HTMLElement} html
 * @param {number} maxEdge
 * @param {{ action: string, label: string, resolve: () => ResolvedPool }[]} buttons
 * @returns {() => void}
 */
export function wireDroneDialog(html, maxEdge, buttons) {
  const update = () => {
    const resolvedByButton = buttons.map((button) => button.resolve());
    const primary = resolvedByButton[0];

    const breakdown = html.querySelector('#poolBreakdown');
    if (breakdown) breakdown.textContent = formatPoolBreakdown(primary);

    const autonomous = primary.mode === ControlModes.AUTONOMOUS;
    const edgeBox = /** @type {HTMLInputElement|null} */ (
      html.querySelector('#edge')
    );
    if (edgeBox) {
      if (autonomous) edgeBox.checked = false;
      edgeBox.disabled = autonomous;
    }
    const skillGroup = /** @type {HTMLElement|null} */ (
      html.querySelector('#riggerSkillGroup')
    );
    if (skillGroup) skillGroup.style.display = autonomous ? 'none' : '';

    const mod =
      getInt(html, 'bonus') -
      getInt(html, 'malus') -
      getInt(html, 'recoilMalus') +
      (getChecked(html, 'specialization') ? 2 : 0) +
      (getChecked(html, 'smartlink') ? 2 : 0) +
      (getChecked(html, 'edge') ? maxEdge : 0);

    buttons.forEach((button, index) => {
      const el = html.querySelector(`button[data-action="${button.action}"]`);
      if (el)
        el.textContent = `${button.label} (${resolvedByButton[index].pool + mod})`;
    });
  };
  html.querySelectorAll('input, select').forEach((el) => {
    const evt =
      el.tagName === 'SELECT' ||
      /** @type {HTMLInputElement} */ (el).type === 'checkbox' ||
      /** @type {HTMLInputElement} */ (el).type === 'radio'
        ? 'change'
        : 'input';
    el.addEventListener(evt, update);
  });
  update();
  return update;
}

/**
 * @param {import('@documents/index').SR4Actor} vehicle
 * @param {string} action
 * @returns {Promise<void>}
 */
export async function openDroneRollDialog(vehicle, action) {
  const rigger = await resolveRigger(vehicle);
  const storedMode = /** @type {any} */ (vehicle.system)?.controlMode;
  if (storedMode !== ControlModes.AUTONOMOUS && !rigger)
    ui.notifications?.warn(localize('sr4.vehicle.noRigger'));

  const riggerSkills = buildRiggerSkillOptions(rigger, action).map(
    (option) => ({ ...option, label: localize(option.label) })
  );
  const paramsActor = rigger ?? vehicle;
  const params = createDialogParameters(paramsActor);

  const content = await renderTemplate(droneRollTemplatePath(), {
    ...params,
    controlModes: buildControlModeOptions(vehicle, rigger),
    riggerSkills,
  });

  const rollLabel = localize(`sr4.vehicle.actions.${action}`);
  const lookup = getRiggerLookup(vehicle);
  const resolve = (html) =>
    resolveDialogPool(html, vehicle, rigger, action, { lookup });

  await foundry.applications.api.DialogV2.prompt({
    window: { title: `${rollLabel} — ${vehicle.name}` },
    content,
    ok: {
      label: localize('sr4.roll.rollButton'),
      callback: async (_event, button) => {
        const html = /** @type {HTMLElement} */ (button.closest('dialog'));
        const resolved = resolve(html);
        const actor = controllingActor(vehicle, rigger, resolved.mode);
        return dialogActions(html, actor, rollLabel, resolved.pool);
      },
    },
    render: (event) => {
      const html = event.target.element;
      wireDroneDialog(html, params.maxEdge, [
        {
          action: 'ok',
          label: localize('sr4.roll.rollButton'),
          resolve: () => resolve(html),
        },
      ]);
    },
  });
}
