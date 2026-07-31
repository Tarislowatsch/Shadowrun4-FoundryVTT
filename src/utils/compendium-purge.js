// @ts-nocheck
import { confirmDialog } from '@utils/dialog';

/**
 * Removes every empty compendium folder, repeating until none remain so that
 * folders emptied by deleting their subfolders are cleaned up as well.
 * @returns {Promise<void>}
 */
async function deleteEmptyCompendiumFolders() {
  for (;;) {
    const folders = game.folders.filter((f) => f.type === 'Compendium');
    const empty = folders.filter(
      (f) =>
        !folders.some((c) => c.folder?.id === f.id) &&
        !game.packs.some((p) => p.folder?.id === f.id)
    );
    if (empty.length === 0) return;
    try {
      await Folder.deleteDocuments(empty.map((f) => f.id));
    } catch (error) {
      console.error('Failed to delete empty compendium folders', error);
      return;
    }
  }
}

/**
 * Deletes every world compendium (keeping the system-provided ones), after
 * confirming with the GM, and cleans up any compendium folders left empty.
 * @returns {Promise<void>}
 */
export async function purgeWorldCompendia() {
  const packs = game.packs.filter((p) => p.metadata.packageType === 'world');

  if (packs.length === 0) {
    ui.notifications?.info(game.i18n.localize('sr4.compendium.purge.none'));
    return;
  }

  const list = packs
    .map((p) => `<li>${foundry.utils.escapeHTML(p.metadata.label)}</li>`)
    .join('');
  const confirmed = await confirmDialog({
    window: { title: game.i18n.localize('sr4.compendium.purge.button') },
    content: `<p>${game.i18n.format('sr4.compendium.purge.confirm', {
      count: packs.length,
    })}</p><ul>${list}</ul>`,
  });
  if (!confirmed) return;

  const rootFolderIds = new Set();
  for (const pack of packs) {
    let folder = pack.folder;
    while (folder) {
      if (!folder.folder) rootFolderIds.add(folder.id);
      folder = folder.folder;
    }
  }

  let deleted = 0;
  for (const pack of packs) {
    try {
      await pack.deleteCompendium();
      deleted += 1;
    } catch (error) {
      console.error(`Failed to delete compendium ${pack.collection}`, error);
    }
  }

  if (rootFolderIds.size > 0) {
    try {
      await Folder.deleteDocuments([...rootFolderIds], {
        deleteSubfolders: true,
        deleteContents: false,
      });
    } catch (error) {
      console.error('Failed to delete compendium folders', error);
    }
  }

  await deleteEmptyCompendiumFolders();

  ui.notifications?.info(
    game.i18n.format('sr4.compendium.purge.result', { deleted })
  );
}
