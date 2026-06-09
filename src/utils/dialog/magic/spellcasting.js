import {
  createDialogParameters,
  createRollDialog,
  dialogActions,
  localize,
  renderTemplate,
  standardTemplatePath,
} from '../dialogutility';

/**
 * Opens a two-step dialog asking the player to choose a spell force.
 * Returns null when the dialog is cancelled.
 * @param {import('@models/index').SR4SpellSystem} spell
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {Promise<number | null>}
 */
export async function askSpellForce(spell, actor) {
  const magic = actor.getAttribute('MAGIC') ?? 0;
  const max = magic * 2;

  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/shadowrun4e/templates/magic/spell-force.hbs',
    { spell, magic, max }
  );

  return foundry.applications.api.DialogV2.prompt({
    window: { title: localize('sr4.spell.forcedialogtitle') },
    content,
    ok: {
      label: localize('sr4.spell.cast'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        const raw = parseInt(dialog.querySelector('#force')?.value ?? '0') || 1;
        // clamp here because the browser max attribute is advisory only —
        // the user can type any number and the callback receives it unchecked
        return Math.min(Math.max(raw, 1), max);
      },
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
 * @param {object} spell
 * @param {number} force
 * @returns {Promise<{successes: number, isGlitch: boolean}>}
 */
export async function openSpellcastingDialog(
  actor,
  skillName,
  numDice,
  spell,
  force
) {
  const params = createDialogParameters(actor, numDice);
  const content = await renderTemplate(standardTemplatePath(), {
    spell,
    force,
    ...params,
    skillName,
  });
  return createRollDialog({
    title: `${localize('sr4.roll.rolling')} ${localize('sr4.skills.' + skillName)} ${spell.name} (${localize('sr4.spell.force')}: ${force})`,
    dice: numDice,
    content,
    onRoll: (dialog) => dialogActions(dialog, actor, skillName, numDice),
  });
}
