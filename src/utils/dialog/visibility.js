import {
  LightConditions,
  ObscurantConditions,
  Senses,
  VISIBILITY_LABEL_PREFIXES,
  availableVisionModes,
  bestVisionMode,
  computeVisibilityModifier,
  hasActiveVisibility,
  isVisibilityApplicable,
  labelledValues,
} from '@models/shared/visibility-rules.js';
import { getSceneVisibility } from '../scene/scene-modifiers.js';

/**
 * @typedef {object} VisibilityOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} selected
 */

/**
 * @typedef {object} VisibilityContext
 * @property {string} light
 * @property {string} obscurant
 * @property {boolean} active
 * @property {string} mode
 * @property {boolean} flareCompensation
 * @property {number} malus
 * @property {VisibilityOption[]} lightOptions
 * @property {VisibilityOption[]} obscurantOptions
 * @property {VisibilityOption[]} modeOptions
 */

/**
 * @typedef {object} SenseOption
 * @property {string} value
 * @property {string} label
 * @property {number} bonus
 * @property {boolean} selected
 */

/**
 * @typedef {object} SenseContext
 * @property {SenseOption[]} options
 * @property {number} bonus
 */

/**
 * @param {Readonly<Record<string, string>> | readonly string[]} values
 * @param {string} selected
 * @param {string} prefix
 * @returns {VisibilityOption[]}
 */
function buildOptions(values, selected, prefix) {
  return labelledValues(values, prefix).map((option) => ({
    ...option,
    selected: option.value === selected,
  }));
}

/**
 * @param {HTMLElement} html
 * @param {string} id
 * @returns {string}
 */
function readValue(html, id) {
  return (
    /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
      html.querySelector(`#${id}`)
    )?.value ?? ''
  );
}

/**
 * @param {any} visionActor
 * @param {{ scene?: object, visualOnly?: boolean }} [options]
 * @returns {VisibilityContext | null}
 */
export function buildVisibilityContext(
  visionActor,
  { scene = globalThis.canvas?.scene, visualOnly = false } = {}
) {
  if (!isVisibilityApplicable(visionActor)) return null;
  const conditions = getSceneVisibility(scene);

  const vision = visionActor?.system?.vision ?? {};
  const flareCompensation = vision.flareCompensation === true;
  const modes = availableVisionModes(vision, { visualOnly });
  const mode = bestVisionMode(conditions, modes, { flareCompensation });
  return {
    ...conditions,
    active: hasActiveVisibility(conditions),
    mode,
    flareCompensation,
    malus: Math.abs(
      computeVisibilityModifier(conditions, mode, { flareCompensation })
    ),
    lightOptions: buildOptions(
      LightConditions,
      conditions.light,
      VISIBILITY_LABEL_PREFIXES.light
    ),
    obscurantOptions: buildOptions(
      ObscurantConditions,
      conditions.obscurant,
      VISIBILITY_LABEL_PREFIXES.obscurant
    ),
    modeOptions: buildOptions(modes, mode, VISIBILITY_LABEL_PREFIXES.vision),
  };
}

/**
 * @param {any} actor
 * @returns {SenseContext}
 */
export function buildSenseContext(actor) {
  const bonuses = actor?.system?.modifiers?.senseBonuses ?? {};
  const options = labelledValues(Senses, VISIBILITY_LABEL_PREFIXES.sense).map(
    (option) => ({
      ...option,
      bonus: Number(bonuses[option.value]) || 0,
      selected: option.value === Senses.SIGHT,
    })
  );
  return { options, bonus: options[0].bonus };
}

/**
 * @param {HTMLElement} html
 * @returns {number}
 */
export function getVisibilityMalus(html) {
  const input = /** @type {HTMLInputElement | null} */ (
    html.querySelector('#visibilityMalus')
  );
  if (!input || input.disabled) return 0;
  return Math.max(0, parseInt(input.value) || 0);
}

/**
 * @param {HTMLElement} html
 * @returns {number}
 */
export function getSenseBonus(html) {
  return parseInt(readValue(html, 'senseBonus')) || 0;
}

/**
 * @param {HTMLElement} html
 * @param {() => void} [onChange]
 * @returns {void}
 */
export function wireVisibilityControls(html, onChange = () => {}) {
  const box = /** @type {HTMLElement | null} */ (
    html.querySelector('.sr4-visibility')
  );
  const sense = /** @type {HTMLSelectElement | null} */ (
    html.querySelector('#sense')
  );
  if (!box && !sense) return;

  const malusInput = /** @type {HTMLInputElement | null} */ (
    html.querySelector('#visibilityMalus')
  );

  const modeSelect = /** @type {HTMLSelectElement | null} */ (
    html.querySelector('#visionMode')
  );

  const readConditions = () => ({
    light: readValue(html, 'visibilityLight'),
    obscurant: readValue(html, 'visibilityObscurant'),
  });

  const flareOptions = () => ({
    flareCompensation: box?.dataset.flareCompensation === 'true',
  });

  const recomputeMalus = () => {
    if (!malusInput || !box) return;
    const modifier = computeVisibilityModifier(
      readConditions(),
      readValue(html, 'visionMode'),
      flareOptions()
    );
    malusInput.value = String(Math.abs(modifier));
  };

  const reselectBestMode = () => {
    if (!modeSelect) return;
    const modes = [...modeSelect.options].map((option) => option.value);
    modeSelect.value = bestVisionMode(readConditions(), modes, flareOptions());
  };

  const applySense = () => {
    if (!sense) return;
    const bonusInput = /** @type {HTMLInputElement | null} */ (
      html.querySelector('#senseBonus')
    );
    if (bonusInput)
      bonusInput.value = sense.selectedOptions[0]?.dataset.bonus ?? '0';
    if (box && malusInput) {
      const sight = sense.value === Senses.SIGHT;
      box.hidden = !sight;
      malusInput.disabled = !sight;
    }
  };

  for (const id of ['visibilityLight', 'visibilityObscurant']) {
    html.querySelector(`#${id}`)?.addEventListener('change', () => {
      reselectBestMode();
      recomputeMalus();
      onChange();
    });
  }
  modeSelect?.addEventListener('change', () => {
    recomputeMalus();
    onChange();
  });
  sense?.addEventListener('change', () => {
    applySense();
    onChange();
  });
  applySense();
}
