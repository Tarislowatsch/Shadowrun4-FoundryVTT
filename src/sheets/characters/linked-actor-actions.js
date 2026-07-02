import { BindingFlow } from '@flows/binding-flow.js';

export async function onOpenLinkedActor(_event, target) {
  const uuid = target.dataset.uuid;
  if (!uuid) return;
  const actor = await fromUuid(uuid);
  if (!actor) {
    ui.notifications.warn(game.i18n.localize('sr4.ui.linkedActorNotFound'));
    return;
  }
  actor.sheet?.render(true);
}

/**
 * @this {import('./character-sheet.js').default}
 * @param {Event} _event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function onBindLinkedActor(_event, target) {
  const uuid = target.dataset.uuid;
  if (!uuid) return;
  const actor = await fromUuid(uuid);
  if (!actor) {
    ui.notifications.warn(game.i18n.localize('sr4.ui.linkedActorNotFound'));
    return;
  }
  await BindingFlow.start(this.actor, actor);
}
