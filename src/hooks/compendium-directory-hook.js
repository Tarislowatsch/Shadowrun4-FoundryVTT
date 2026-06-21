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

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sr4XmlImport = '';
    button.innerHTML = `<i class="fas fa-file-import"></i> ${game.i18n.localize(
      'sr4.importer.button'
    )}`;
    button.addEventListener('click', () => new XmlImporterApp().render(true));

    const header =
      root.querySelector('.header-actions') ??
      root.querySelector('.directory-header');
    if (header) header.appendChild(button);
    else root.prepend(button);
  }
}
