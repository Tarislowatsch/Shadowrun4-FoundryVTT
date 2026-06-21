// @ts-nocheck
import { CharacterImporterApp } from '@sheets/importer/character-importer-app.js';

export class ActorDirectoryHook {
  constructor() {
    Hooks.on('renderActorDirectory', this.#onRender.bind(this));
  }

  /**
   * @param {Application} app
   * @param {HTMLElement | JQuery} html
   * @returns {void}
   */
  #onRender(app, html) {
    if (!game.user?.isGM) return;

    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector('[data-sr4-character-import]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sr4CharacterImport = '';
    button.innerHTML = `<i class="fas fa-user-plus"></i> ${game.i18n.localize(
      'sr4.characterImporter.button'
    )}`;
    button.addEventListener('click', () =>
      new CharacterImporterApp().render(true)
    );

    const header =
      root.querySelector('.header-actions') ??
      root.querySelector('.directory-header');
    if (header) header.appendChild(button);
    else root.prepend(button);
  }
}
