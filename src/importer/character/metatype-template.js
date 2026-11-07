import { SYSTEM_ID } from '@utils/game/system-id.js';

/**
 * @param {any} pack
 * @returns {number}
 */
function packPriority(pack) {
  const { packageType, packageName } = pack.metadata ?? {};
  if (packageType === 'world') return 0;
  if (packageType === 'system' && packageName === SYSTEM_ID) return 1;
  return -1;
}

/**
 * @param {string[]} names
 * @param {{ items?: Iterable<any>, packs?: Iterable<any> }} [sources]
 * @returns {Promise<object | null>}
 */
export async function findMetatypeTemplate(
  names,
  { items = game.items ?? [], packs = game.packs ?? [] } = {}
) {
  for (const name of names) {
    for (const item of items) {
      if (item.type === 'Metatype' && item.name === name) return item;
    }
  }
  const itemPacks = [...packs]
    .filter((pack) => pack.documentName === 'Item' && packPriority(pack) >= 0)
    .sort((a, b) => packPriority(a) - packPriority(b));
  for (const name of names) {
    for (const pack of itemPacks) {
      const index = await pack.getIndex({ fields: ['type'] });
      const entry = [...index].find(
        (e) => e.type === 'Metatype' && e.name === name
      );
      if (entry) return pack.getDocument(entry._id);
    }
  }
  return null;
}
