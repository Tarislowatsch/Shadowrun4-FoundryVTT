import { TEMPLATES, renderTemplate } from '@utils/templates';
import { spellNeedsSight } from '@models/index';
import {
  areaRadius,
  clampRadiusAdjust,
  radiusAdjustCost,
} from '../area-radius.js';
import { offersAreaTemplate } from '../area-template.js';
import { SR4 } from '@config';
import { getGame } from '@utils/game/game.js';
import {
  createRollDialog,
  localize,
  createDialogParameters,
  dialogActions,
  promptDialog,
} from '@utils/dialog';

/**
 * @typedef {object} SpellForceChoice
 * @property {number} force
 * @property {number} radiusAdjust
 * @property {boolean} placeTemplate
 */

/**
 * @typedef {object} SpellForceOptions
 * @property {number} max
 * @property {boolean} area
 * @property {number} pool
 * @property {boolean} template
 */

/**
 * @param {string} rawForce
 * @param {string} rawAdjust
 * @param {SpellForceOptions} options
 * @param {boolean} [placeTemplateChecked]
 * @returns {SpellForceChoice}
 */
export function parseSpellForceChoice(
  rawForce,
  rawAdjust,
  { max, area, pool, template },
  placeTemplateChecked = false
) {
  const force = Math.min(Math.max(parseInt(rawForce) || 1, 1), max);
  const radiusAdjust = area
    ? clampRadiusAdjust(parseInt(rawAdjust), force, pool)
    : 0;
  return {
    force,
    radiusAdjust,
    placeTemplate: template && placeTemplateChecked,
  };
}

/**
 * @param {Pick<HTMLElement, 'querySelector'>} root
 * @param {SpellForceOptions} options
 * @returns {SpellForceChoice}
 */
function readSpellForceChoice(root, options) {
  return parseSpellForceChoice(
    root.querySelector('#force')?.value ?? '',
    root.querySelector('#radiusAdjust')?.value ?? '',
    options,
    !!root.querySelector('#placeTemplate')?.checked
  );
}

/**
 * @param {Pick<HTMLElement, 'querySelector'>} root
 * @param {SpellForceOptions} options
 * @param {{ writeBack: boolean }} mode
 * @returns {void}
 */
export function syncAreaFields(root, options, { writeBack }) {
  const { force, radiusAdjust } = readSpellForceChoice(root, options);
  const radius = root.querySelector('[data-area-radius]');
  const withheld = root.querySelector('[data-area-withheld]');
  if (radius) radius.textContent = String(areaRadius(force, radiusAdjust));
  if (withheld) withheld.textContent = String(radiusAdjustCost(radiusAdjust));
  if (!writeBack) return;
  const forceInput = root.querySelector('#force');
  const adjustInput = root.querySelector('#radiusAdjust');
  if (forceInput) forceInput.value = String(force);
  if (adjustInput) adjustInput.value = String(radiusAdjust);
}

/**
 * @param {import('@models/index').SR4Spell} spell
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} pool
 * @returns {Promise<SpellForceChoice | null>}
 */
export async function askSpellForce(spell, actor, pool) {
  const magic = actor.getEffectiveMagic();
  const max = magic * 2;
  const area = !!spell.system?.area;
  const template = offersAreaTemplate(spell);
  const options = { max, area, pool, template };

  const content = await renderTemplate(TEMPLATES.magic.spellForce, {
    spell,
    magic,
    max,
    area,
    template,
    templateDefault:
      template && !!getGame().settings.get(SR4.namespace, 'spellAreaTemplates'),
  });

  return promptDialog({
    window: { title: localize('sr4.spell.forcedialogtitle') },
    content,
    render: (event) => {
      if (!area) return;
      const root = event.target.element;
      root.querySelectorAll('#force, #radiusAdjust').forEach((el) => {
        el.addEventListener('input', () =>
          syncAreaFields(root, options, { writeBack: false })
        );
        el.addEventListener('change', () =>
          syncAreaFields(root, options, { writeBack: true })
        );
      });
      syncAreaFields(root, options, { writeBack: false });
    },
    ok: {
      label: localize('sr4.spell.cast'),
      callback: (_event, button) =>
        readSpellForceChoice(button.closest('dialog'), options),
    },
    cancel: {
      label: localize('sr4.cancel'),
      callback: () => null,
    },
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {string} skillName
 * @param {number} numDice
 * @param {import('@models/index').SR4Spell} spell
 * @param {number} force
 * @param {{ poolModifier?: number, edgePayment?: import('@utils/dialog').EdgePayment | null, details?: string }} [options]
 * @returns {Promise<{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}>}
 */
export async function openSpellcastingDialog(
  actor,
  skillName,
  numDice,
  spell,
  force,
  { poolModifier = 0, edgePayment = null, details } = {}
) {
  const effectiveDice = Math.max(1, numDice + poolModifier);
  const params = createDialogParameters(actor, effectiveDice, undefined, {
    edgePayment,
    visibility: spellNeedsSight(spell),
    visualOnly: true,
  });
  let content = await renderTemplate(TEMPLATES.ui.dialogs.roll, {
    spell,
    force,
    ...params,
    skillName,
  });
  if (poolModifier !== 0) {
    const penaltyHtml = `<div class="form-group"><span>${localize('sr4.spell.essencePenalty')}: <strong>${poolModifier}</strong></span></div>`;
    content = penaltyHtml + content;
  }
  return createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize('sr4.skills.' + skillName)} ${spell.name} (${localize('sr4.spell.force')}: ${force})`,
    dice: effectiveDice,
    content,
    onRoll: (dialog) =>
      dialogActions(dialog, actor, skillName, effectiveDice, undefined, {
        edgePayment,
        details,
      }),
  });
}
