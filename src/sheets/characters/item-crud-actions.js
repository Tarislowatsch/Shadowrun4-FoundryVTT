import { promptSelectDialog } from '@utils/dialog';

export async function onOpenCreateItemDialog(_event, _target) {
  const types = [
    'Ranged Weapon',
    'Melee Weapon',
    'Armor',
    'Implant',
    'Commlink',
    'Gear',
    'Ammo',
    'Weapon Mod',
    'Armor Mod',
    'Action',
  ];
  const result = await promptSelectDialog({
    title: game.i18n.localize('sr4.item.create'),
    okLabel: game.i18n.localize('sr4.item.create'),
    options: types.map((t) => ({
      value: t,
      label: game.i18n.localize(`TYPES.Item.${t}`),
    })),
  });
  if (!result) return;
  const [item] = await this.actor.createEmbeddedDocuments('Item', [
    { name: game.i18n.localize(`TYPES.Item.${result}`), type: result },
  ]);
  item?.sheet?.render(true);
}

export async function onCreateItem(event, target) {
  const type = target.dataset.itemType;
  if (!type) return;
  const system = target.dataset.itemSubtype
    ? { type: target.dataset.itemSubtype }
    : {};
  const [item] = await this.actor.createEmbeddedDocuments('Item', [
    { name: game.i18n.localize(`TYPES.Item.${type}`), type, system },
  ]);
  item?.sheet?.render(true);
}

export async function onDeleteItem(event, target) {
  const itemId = target.closest('[data-item-id]')?.dataset.itemId;
  if (!itemId) return;
  await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
}

export async function onEditItem(event, target) {
  const itemId = target.closest('[data-item-id]')?.dataset.itemId;
  if (!itemId) return;
  this.actor.items.get(itemId)?.sheet?.render(true);
}

export async function onToggleEquip(event, target) {
  const itemId = target.closest('[data-item-id]')?.dataset.itemId;
  if (!itemId) return;
  const item = this.actor.items.get(itemId);
  if (!item) return;
  const equipped = !item.system.equipped;
  await item.update({ 'system.equipped': equipped });
  if (equipped && item.type === 'Commlink') {
    const others = this.actor.items.filter(
      (i) => i.type === 'Commlink' && i.id !== item.id && i.system?.equipped
    );
    if (others.length) {
      await this.actor.updateEmbeddedDocuments(
        'Item',
        others.map((i) => ({ _id: i.id, 'system.equipped': false }))
      );
    }
  }
}

export async function onMonitorBox(event, target) {
  const index = Number(target.dataset.index);
  const type =
    target.dataset.type ?? target.closest('.monitor-track')?.dataset.type;
  if (!type) return;
  const path = `system.conditionMonitor.${type}.value`;
  const current = foundry.utils.getProperty(this.actor, path);
  const newValue = index + 1 === current ? index : index + 1;
  await this.actor.update({ [path]: newValue });
}

export async function onEditAmmo(event, target) {
  const ammoId = target.dataset.ammoId;
  if (!ammoId) return;
  this.actor.items.get(ammoId)?.sheet?.render(true);
}

export async function onCreateMod(event, target) {
  const hostId = target.closest('[data-item-id]')?.dataset.itemId;
  const modType = target.dataset.itemType;
  if (!hostId || !modType) return;
  const host = this.actor.items.get(hostId);
  if (!host) return;
  const [mod] = await this.actor.createEmbeddedDocuments('Item', [
    { name: game.i18n.localize(`TYPES.Item.${modType}`), type: modType },
  ]);
  if (!mod) return;
  const current = host.system.installedModIds ?? [];
  await host.update({ 'system.installedModIds': [...current, mod.id] });
  mod.sheet?.render(true);
}

export async function onRemoveMod(event, target) {
  const modId =
    target.dataset.modId ?? target.closest('[data-mod-id]')?.dataset.modId;
  const hostId = target.closest('[data-item-id]')?.dataset.itemId;
  if (!modId || !hostId) return;
  const host = this.actor.items.get(hostId);
  if (!host) return;
  const current = host.system.installedModIds ?? [];
  await host.update({
    'system.installedModIds': current.filter((id) => id !== modId),
  });
}

export async function onToggleItemEffect(event, target) {
  const itemId = target.dataset.itemId;
  const effectId = target.dataset.effectId;
  if (!itemId || !effectId) return;
  const item = this.actor.items.get(itemId);
  const effect = item?.effects.get(effectId);
  if (!effect) return;
  await effect.update({ disabled: !effect.disabled });
}
