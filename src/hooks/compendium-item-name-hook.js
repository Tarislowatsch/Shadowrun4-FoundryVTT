// @ts-nocheck
import { renderTemplate } from '@utils/templates';
import { resolveItemNameTranslation } from '@utils/item-name-translations.js';

const REVEAL_DELAY_MS = 220;

export class CompendiumItemNameHook {
  /** @type {HTMLElement | null} */
  #matchTemplate = null;

  /** @type {Array<{ uuid: string, name: string, img: string, pack: CompendiumCollection }> | null} */
  #crossPackIndexCache = null;

  constructor() {
    Hooks.on('renderCompendium', this.#onRender.bind(this));
    Hooks.on('renderCompendiumDirectory', this.#onRenderDirectory.bind(this));
    Hooks.on('updateCompendium', () => this.#invalidateCrossPackIndex());
    Hooks.on('updateSetting', (setting) => {
      if (setting.key === 'shadowrun4e.itemNameTranslations')
        this.#invalidateCrossPackIndex();
    });
  }

  /**
   * @returns {void}
   */
  #invalidateCrossPackIndex() {
    this.#crossPackIndexCache = null;
  }

  /**
   * @param {HTMLElement | JQuery} html
   * @returns {HTMLElement | null}
   */
  #resolveRoot(html) {
    return html instanceof HTMLElement ? html : (html?.[0] ?? null);
  }

  /**
   * @param {HTMLElement} root
   * @returns {HTMLElement | null}
   */
  #getSearchInput(root) {
    return root.querySelector('search input, input[type="search"]');
  }

  /**
   * @param {string} raw
   * @returns {RegExp}
   */
  #buildQueryRegex(raw) {
    return new RegExp(RegExp.escape(raw), 'i');
  }

  /**
   * @param {RegExp} rgx
   * @param {string} text
   * @returns {boolean}
   */
  #matchesQuery(rgx, text) {
    return rgx.test(foundry.applications.ux.SearchFilter.cleanQuery(text));
  }

  /**
   * @param {Application} app
   * @param {HTMLElement | JQuery} html
   * @returns {Promise<void>}
   */
  async #onRender(app, html) {
    const pack = app.collection ?? app.pack;
    if (!pack || pack.documentName !== 'Item') return;

    const root = this.#resolveRoot(html);
    if (!root) return;

    const index = await pack.getIndex({ fields: ['system.label'] });
    const lang = game.i18n.lang;

    /** @type {Map<string, string>} */
    const translated = new Map();
    for (const entry of index) {
      const label = entry.system?.label;
      if (!label) continue;
      const text = resolveItemNameTranslation(label, lang);
      if (text) translated.set(entry._id, text);
    }

    for (const li of root.querySelectorAll('[data-entry-id]')) {
      const text = translated.get(li.dataset.entryId);
      if (!text) continue;
      const nameEl = li.querySelector('.entry-name, .document-name, a') ?? li;
      nameEl.textContent = text;
    }

    this.#patchSearch(root, translated);
  }

  /**
   * @param {HTMLElement} root
   * @param {Map<string, string>} translated
   * @returns {void}
   */
  #patchSearch(root, translated) {
    const input = this.#getSearchInput(root);
    if (!input || input.dataset.sr4TranslatedSearch) return;
    input.dataset.sr4TranslatedSearch = 'true';

    input.addEventListener('input', () => {
      const raw = input.value.trim();
      if (!raw) return;
      const rgx = this.#buildQueryRegex(raw);

      // Runs after Foundry's own (debounced, 200ms) search filter so we only
      // reveal entries it hid, without racing its own DOM updates.
      window.setTimeout(() => {
        for (const li of root.querySelectorAll('[data-entry-id]')) {
          if (li.style.display !== 'none') continue;
          const text = translated.get(li.dataset.entryId);
          if (text && this.#matchesQuery(rgx, text)) li.style.display = 'flex';
        }
      }, REVEAL_DELAY_MS);
    });
  }

  /**
   * @param {Application} app
   * @param {HTMLElement | JQuery} html
   * @returns {Promise<void>}
   */
  async #onRenderDirectory(app, html) {
    const root = this.#resolveRoot(html);
    if (!root) return;

    const input = this.#getSearchInput(root);
    if (!input || input.dataset.sr4TranslatedSearch) return;
    input.dataset.sr4TranslatedSearch = 'true';

    const crossPackIndex = await this.#buildCrossPackIndex();
    const matchTemplate = await this.#getMatchTemplate();

    input.addEventListener('input', () => {
      const list = root.querySelector('.directory-list');
      if (!list) return;

      for (const li of list.querySelectorAll('[data-sr4-document-match]'))
        li.remove();

      const raw = input.value.trim();
      const minLength = CONFIG.i18n?.searchMinimumCharacterLength ?? 5;
      if (raw.length < minLength) return;

      window.setTimeout(() => {
        const rgx = this.#buildQueryRegex(raw);
        const existingUuids = new Set(
          [...list.querySelectorAll('li[data-document-match]')].map(
            (li) => li.dataset.uuid
          )
        );

        for (const entry of crossPackIndex) {
          if (existingUuids.has(entry.uuid)) continue;
          if (!this.#matchesQuery(rgx, entry.name)) continue;

          const li = matchTemplate.cloneNode(true);
          li.dataset.uuid = entry.uuid;
          li.dataset.type = 'Item';
          li.dataset.sr4DocumentMatch = 'true';

          const imgEl = li.querySelector('img');
          if (imgEl) {
            imgEl.alt = entry.name;
            imgEl.src = entry.img ?? 'icons/svg/book.svg';
          }
          const nameAnchor = li.querySelector('a[data-name]');
          if (nameAnchor) nameAnchor.textContent = entry.name;
          const packAnchor = li.querySelector('a[data-pack]');
          if (packAnchor) {
            packAnchor.dataset.pack = entry.pack.metadata.id;
            packAnchor.append(' ', entry.pack.title);
          }
          const sourceEl = li.querySelector('[data-source]');
          if (sourceEl) sourceEl.hidden = true;

          list.append(li);
        }
      }, REVEAL_DELAY_MS);
    });
  }

  /**
   * @returns {Promise<Array<{ uuid: string, name: string, img: string, pack: CompendiumCollection }>>}
   */
  async #buildCrossPackIndex() {
    if (this.#crossPackIndexCache) return this.#crossPackIndexCache;

    const lang = game.i18n.lang;
    const itemPacks = [...game.packs].filter(
      (pack) => pack.documentName === 'Item'
    );
    const perPackEntries = await Promise.all(
      itemPacks.map(async (pack) => {
        const index = await pack.getIndex({ fields: ['system.label'] });
        const entries = [];
        for (const entry of index) {
          const label = entry.system?.label;
          if (!label) continue;
          const text = resolveItemNameTranslation(label, lang);
          if (!text) continue;
          entries.push({
            uuid: pack.getUuid(entry._id),
            name: text,
            img: entry.img,
            pack,
          });
        }
        return entries;
      })
    );

    this.#crossPackIndexCache = perPackEntries.flat();
    return this.#crossPackIndexCache;
  }

  /**
   * @returns {Promise<HTMLElement>}
   */
  async #getMatchTemplate() {
    if (this.#matchTemplate) return this.#matchTemplate;
    const html = await renderTemplate(
      'templates/sidebar/partials/document-match.hbs'
    );
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const root = template.content.firstElementChild;
    if (!root) {
      throw new Error(
        'SR4 | CompendiumItemNameHook: document-match.hbs did not yield a root element.'
      );
    }
    this.#matchTemplate = root;
    return this.#matchTemplate;
  }
}
