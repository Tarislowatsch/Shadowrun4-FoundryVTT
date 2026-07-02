import SR4ActiveEffectSheet from '@sheets/effects/SR4ActiveEffectSheet';

export async function onCreateEffect(_event, _target) {
  await this.actor.createEmbeddedDocuments('ActiveEffect', [
    {
      name: game.i18n.localize('sr4.effect.new'),
      changes: [{ key: 'system.sheetStats.BODY', type: 'add', value: 0 }],
      disabled: false,
    },
  ]);
}

export async function onToggleEffect(event, target) {
  const effectId =
    target.dataset.effectId ??
    target.closest('[data-effect-id]')?.dataset.effectId;
  if (!effectId) return;
  const effect = this.actor.effects.get(effectId);
  if (!effect) return;
  await effect.update({ disabled: !effect.disabled });
}

export async function onEditEffect(event, target) {
  const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
  if (!effectId) return;
  const effect = this.actor.effects.get(effectId);
  if (!effect) return;
  new SR4ActiveEffectSheet({ document: effect }).render(true);
}

export async function onDeleteEffect(event, target) {
  const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
  if (!effectId) return;
  await this.actor.deleteEmbeddedDocuments('ActiveEffect', [effectId]);
}
