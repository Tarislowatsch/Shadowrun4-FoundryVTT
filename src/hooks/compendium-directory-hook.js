// @ts-nocheck
import { XmlImporterApp } from '@sheets/importer/importer-app.js';
import { openTranslatePackDialog } from '@sheets/importer/translate-pack-dialog.js';
import { purgeWorldCompendia } from '@utils/compendium-purge.js';

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

    const translateButton = document.createElement('button');
    translateButton.type = 'button';
    translateButton.dataset.sr4TranslatePack = '';
    translateButton.classList.add('flex0');
    translateButton.title = game.i18n.localize(
      'sr4.importer.translatePackButton'
    );
    translateButton.setAttribute(
      'aria-label',
      game.i18n.localize('sr4.importer.translatePackButton')
    );
    translateButton.innerHTML = '<i class="fas fa-language"></i>';
    translateButton.addEventListener('click', () => openTranslatePackDialog());

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
    purgeButton.addEventListener('click', () => purgeWorldCompendia());

    if (header === root) {
      root.prepend(purgeButton);
      root.prepend(translateButton);
      root.prepend(importButton);
    } else {
      header.appendChild(importButton);
      header.appendChild(translateButton);
      header.appendChild(purgeButton);
    }
  }
}
