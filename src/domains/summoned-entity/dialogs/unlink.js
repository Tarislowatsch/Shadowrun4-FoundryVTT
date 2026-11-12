import { confirmDialog } from '@utils/dialog';
import { unlinkFromOwner } from '../owner-link.js';

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {Promise<boolean>}
 */
export async function confirmAndUnlink(actor) {
  const confirmed = await confirmDialog({
    window: { title: game.i18n.localize('sr4.ui.unlinkActor') },
    content: `<p>${game.i18n.format('sr4.ui.unlinkActorConfirm', { name: foundry.utils.escapeHTML(actor.name) })}</p>`,
  });
  if (!confirmed) return false;
  await unlinkFromOwner(actor);
  return true;
}
