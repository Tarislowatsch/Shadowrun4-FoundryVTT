import { Shootingmodes } from '@models/index';
import { localize, getInt, promptDialog } from '@utils/dialog';

/** @typedef {import('@models/index').SR4Weapon} SR4Weapon */

/** @type {Record<string, number[]>} */
export const SHOTS_BY_MODE = {
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
  SINGLE_SEMI: [Shootingmodes.SINGLE_SHOT, Shootingmodes.SEMI_AUTOMATIC],
  SINGLE_SEMI_BURST: [
    Shootingmodes.SINGLE_SHOT,
    Shootingmodes.SEMI_AUTOMATIC,
    Shootingmodes.BURST_FIRE,
  ],
  SINGLE_SEMI_BURST_FULL_AUTO: [
    Shootingmodes.SINGLE_SHOT,
    Shootingmodes.SEMI_AUTOMATIC,
    Shootingmodes.BURST_FIRE,
    Shootingmodes.FULL_AUTO,
  ],
  BURST_FULL_AUTO: [Shootingmodes.BURST_FIRE, Shootingmodes.FULL_AUTO],
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
export const BURST_MODIFIERS = {
  3: { narrow: 2, wide: 2 },
  6: { narrow: 5, wide: 5 },
  10: { narrow: 9, wide: 9 },
};

export const MODES_WITH_BURST_OPTION = new Set([
  Shootingmodes.BURST_FIRE,
  Shootingmodes.FULL_AUTO,
]);

/**
 * @param {SR4Weapon} weapon
 * @returns {{ showFireModeUI: boolean, showModeRadios?: boolean, hasBurstModes: boolean, fireModes: string[], shotOptions: number[] }}
 */
export function getFireModeParams(weapon) {
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
 * @param {SR4Weapon} weapon
 * @returns {Promise<{ shots: number, recoil: number, wideDefenseMalus: number, burstDamageBonus: number } | null>}
 */
export async function selectFireModeForSplit(weapon) {
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

  const selectedMode = await promptDialog({
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
 * @param {HTMLElement} html
 * @param {SR4Weapon & { type: 'Ranged Weapon', system: import('@models/index').SR4RangedWeaponSystem }} weapon
 * @param {{ fireModes: string[] }} fireModeParams
 * @param {boolean} ammoTracking
 * @param {() => void} updateLabel
 * @returns {void}
 */
export function wireFireModeControls(
  html,
  weapon,
  fireModeParams,
  ammoTracking,
  updateLabel
) {
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
    el.style.color = weapon.system.currentAmmo < shots ? 'var(--sr4-red)' : '';
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
        updateShotOptions(/** @type {HTMLInputElement} */ (e.target).value)
      )
    );
  html
    .querySelectorAll('input[name="burstMode"]')
    .forEach((el) =>
      el.addEventListener('change', () =>
        updateBurstModifiers(getSelectedMode(), getInt(html, 'shotCount'))
      )
    );
  html.querySelector('#shotCount')?.addEventListener('change', updateRecoil);

  updateShotOptions(getSelectedMode());
}
