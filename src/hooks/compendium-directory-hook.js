// @ts-nocheck
import { XmlImporterApp } from '@sheets/importer/importer-app.js';

export class CompendiumDirectoryHook {
  constructor() {
    Hooks.on('renderCompendiumDirectory', this.#onRender.bind(this));
  }

  /**
   * @param {Application} app
   * @param {HTMLElement | JQuery} html
   * @returns {void}
   */
  #onRender(app, html) {
    if (!game.user?.isGM) return;

    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector('[data-sr4-xml-import]')) return;

    const header =
      root.querySelector('.header-actions') ??
      root.querySelector('.directory-header') ??
      root;

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.dataset.sr4XmlImport = '';
    importButton.innerHTML = `<i class="fas fa-file-import"></i> ${game.i18n.localize(
      'sr4.importer.button'
    )}`;
    importButton.addEventListener('click', () =>
      new XmlImporterApp().render(true)
    );

    const purgeButton = document.createElement('button');
    purgeButton.type = 'button';
    purgeButton.dataset.sr4PurgePacks = '';
    purgeButton.classList.add('flex0');
    purgeButton.title = game.i18n.localize('sr4.compendium.purge.button');
    purgeButton.setAttribute(
      'aria-label',
      game.i18n.localize('sr4.compendium.purge.button')
    );
    purgeButton.innerHTML = '<i class="fas fa-trash"></i>';
    purgeButton.addEventListener('click', () => this.#onPurge());

    if (header === root) {
      root.prepend(purgeButton);
      root.prepend(importButton);
    } else {
      header.appendChild(importButton);
      header.appendChild(purgeButton);
    }
  }

  /**
   * Deletes every world compendium, keeping the system-provided ones.
   *
   * @returns {Promise<void>}
   */
  async #onPurge() {
    const packs = game.packs.filter((p) => p.metadata.packageType === 'world');

    if (packs.length === 0) {
      ui.notifications?.info(game.i18n.localize('sr4.compendium.purge.none'));
      return;
    }

    const list = packs
      .map((p) => `<li>${foundry.utils.escapeHTML(p.metadata.label)}</li>`)
      .join('');
    const confirmed = await foundry.applications.api.DialogV2.confirm({
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

    await this.#deleteEmptyCompendiumFolders();

    ui.notifications?.info(
      game.i18n.format('sr4.compendium.purge.result', { deleted })
    );
  }

  /**
   * Removes every empty compendium folder, repeating until none remain so that
   * folders emptied by deleting their subfolders are cleaned up as well.
   *
   * @returns {Promise<void>}
   */
  async #deleteEmptyCompendiumFolders() {
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
}
