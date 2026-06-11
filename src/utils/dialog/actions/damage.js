import { getGame } from '@utils/game/game';
import { renderTemplate } from '../dialogutility';
import { showEdgeDialog } from '@utils/rolls';

/** @returns {string} */
function modifyDamageTemplatePath() {
  return 'systems/shadowrun4e/templates/modify-damage-dialog.hbs';
}
/**
 * Opens a dialog allowing the user to adjust the damage amount before applying.
 *
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} amount
 * @param {boolean} isPhysical
 * @returns {Promise<number | null>}
 */
export async function openModifyDamageDialog(actor, amount, isPhysical) {
  const damageType = isPhysical
    ? getGame().i18n.localize('sr4.damage.physical')
    : getGame().i18n.localize('sr4.damage.stun');

  const content = await renderTemplate(modifyDamageTemplatePath(), {
    name: actor.name,
    amount,
    damageType,
  });

  return foundry.applications.api.DialogV2.prompt({
    window: { title: getGame().i18n.localize('sr4.damage.modify') },
    content,
    ok: {
      label: getGame().i18n.localize('sr4.damage.apply'),
      callback: (_event, button) => {
        const html = button.closest('dialog');
        const bonus = parseInt(html.querySelector('#bonus')?.value) || 0;
        const malus = parseInt(html.querySelector('#malus')?.value) || 0;
        return Math.max(amount + bonus - malus, 0);
      },
    },
  });
}
