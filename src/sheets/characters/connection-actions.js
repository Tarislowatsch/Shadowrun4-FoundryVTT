export async function onCreateConnection(_event, _target) {
  await this.actor.update({
    [`system.connections.${foundry.utils.randomID()}`]: {},
  });
}

export async function onDeleteConnection(event, target) {
  const key =
    target.dataset.connectionKey ??
    target.closest('[data-connection-key]')?.dataset.connectionKey;
  if (!key) return;
  await this.actor.update({ [`system.connections.-=${key}`]: null });
}
