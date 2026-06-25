// @ts-nocheck
import { extractRecords } from '@importer/parse-xml.js';
import { buildImportGroups, buildTypeTree } from '@importer/grouping.js';

/**
 * Number of documents created per `createDocuments` call.
 * @type {number}
 */
const CHUNK_SIZE = 100;

export class XmlImporterApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /**
   * Import groups derived from parsed records, grouped by source × subcategory.
   * @type {import('@importer/grouping.js').ImportGroup[]}
   */
  #groups = [];

  /** @type {string[]} */
  #availableSources = [];

  /** @type {Set<string>} */
  #enabledSources = new Set();

  /** @type {boolean} */
  #importing = false;

  static DEFAULT_OPTIONS = {
    id: 'sr4-xml-importer',
    window: {
      title: 'sr4.importer.title',
      icon: 'fas fa-file-import',
      resizable: true,
    },
    position: { width: 580, height: 560 },
    actions: {
      import: XmlImporterApp.#onImport,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/importer/importer.hbs',
    },
  };

  /** @override */
  async _prepareContext() {
    const filtered = this.#groups.filter((g) =>
      this.#enabledSources.has(g.source)
    );

    const types = buildTypeTree(filtered);

    const sources = this.#availableSources.map((code) => ({
      code,
      enabled: this.#enabledSources.has(code),
    }));

    const hasData = filtered.some((g) => g.records.length > 0);
    const hasSources = this.#availableSources.length > 0;
    return { types, hasData, sources, hasSources };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);

    this.element
      .querySelector('[data-files]')
      ?.addEventListener('change', this.#onFilesSelected.bind(this));

    const el = this.element;

    for (const cb of el.querySelectorAll('[data-source-filter]')) {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          this.#enabledSources.add(cb.dataset.sourceFilter);
        } else {
          this.#enabledSources.delete(cb.dataset.sourceFilter);
        }
        this.render();
      });
    }

    for (const toggle of el.querySelectorAll('[data-type-toggle]')) {
      toggle.addEventListener('change', () => {
        const typeId = toggle.dataset.typeToggle;
        for (const sub of el.querySelectorAll(
          `[data-subcat-toggle][data-type="${typeId}"]`
        )) {
          sub.checked = toggle.checked;
          sub.indeterminate = false;
        }
        for (const cb of el.querySelectorAll(
          `[data-group][data-type="${typeId}"]`
        )) {
          if (!cb.disabled) cb.checked = toggle.checked;
        }
      });
    }

    for (const toggle of el.querySelectorAll('[data-subcat-toggle]')) {
      toggle.addEventListener('change', () => {
        const subcatId = toggle.dataset.subcatToggle;
        for (const cb of el.querySelectorAll(`[data-subcat="${subcatId}"]`)) {
          if (!cb.disabled) cb.checked = toggle.checked;
        }
        this.#refreshTypeToggle(toggle.dataset.type);
      });
    }

    for (const cb of el.querySelectorAll('[data-group]')) {
      cb.addEventListener('change', () => {
        if (cb.dataset.subcat) this.#refreshSubcatToggle(cb.dataset.subcat);
        this.#refreshTypeToggle(cb.dataset.type);
      });
    }
  }

  /**
   * @param {string} subcatId
   */
  #refreshSubcatToggle(subcatId) {
    this.#refreshToggle(
      `[data-subcat-toggle="${subcatId}"]`,
      `[data-subcat="${subcatId}"]:not(:disabled)`
    );
  }

  /**
   * @param {string} typeId
   */
  #refreshTypeToggle(typeId) {
    this.#refreshToggle(
      `[data-type-toggle="${typeId}"]`,
      `[data-group][data-type="${typeId}"]:not(:disabled)`
    );
  }

  /**
   * Syncs a parent toggle's checked/indeterminate state from its enabled
   * descendant checkboxes.
   *
   * @param {string} toggleSelector - Selector for the parent toggle.
   * @param {string} childSelector - Selector for the enabled descendants.
   */
  #refreshToggle(toggleSelector, childSelector) {
    const toggle = this.element.querySelector(toggleSelector);
    if (!toggle) return;
    const siblings = [...this.element.querySelectorAll(childSelector)];
    const checked = siblings.filter((s) => s.checked).length;
    toggle.checked = checked > 0;
    toggle.indeterminate = checked > 0 && checked < siblings.length;
  }

  /**
   * Reads and parses the selected XML files, then re-renders the preview.
   *
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async #onFilesSelected(event) {
    const files = [...(event.target.files ?? [])];
    if (files.length === 0) return;

    /** @type {Record<string, Array<Record<string, unknown>>>} */
    const aggregated = {};
    for (const file of files) {
      try {
        const records = extractRecords(await file.text());
        for (const [tag, entries] of Object.entries(records)) {
          aggregated[tag] = (aggregated[tag] ?? []).concat(entries);
        }
      } catch (err) {
        ui.notifications.error(
          game.i18n.format('sr4.importer.parseError', {
            file: file.name,
            error: err.message,
          })
        );
      }
    }

    this.#groups = buildImportGroups(aggregated);
    this.#availableSources = [
      ...new Set(this.#groups.map((g) => g.source)),
    ].sort();

    const saved = game.settings.get('shadowrun4e', 'importerEnabledSources');
    if (saved.length > 0) {
      const available = new Set(this.#availableSources);
      this.#enabledSources = new Set(saved.filter((s) => available.has(s)));
    } else {
      this.#enabledSources = new Set(this.#availableSources);
    }

    await this.render();
  }

  /**
   * @param {string} name
   * @returns {Promise<string>}
   */
  async #getOrCreateFolder(name, parentId = null) {
    const existing = game.folders.find(
      (f) =>
        f.type === 'Compendium' &&
        f.name === name &&
        (parentId ? f.folder?.id === parentId : !f.folder)
    );
    if (existing) return existing.id;
    const data = { name, type: 'Compendium' };
    if (parentId) data.folder = parentId;
    const folder = await Folder.create(data);
    return folder?.id ?? null;
  }

  /**
   * @param {string} name
   * @param {string} label
   * @param {string|null} [folderId]
   * @returns {Promise<CompendiumCollection>}
   */
  async #getOrCreatePack(name, label, folderId = null) {
    let pack = game.packs.get(`world.${name}`);
    if (!pack) {
      pack =
        await foundry.documents.collections.CompendiumCollection.createCompendium(
          { type: 'Item', label, name, package: 'world' }
        );
    }
    if (folderId && pack.folder?.id !== folderId) {
      await pack.configure({ folder: folderId });
    }
    return pack;
  }

  /**
   * Imports all selected groups into their world compendia.
   *
   * @this {XmlImporterApp}
   * @returns {Promise<void>}
   */
  static async #onImport() {
    if (this.#importing) return;
    this.#importing = true;

    const button = this.element.querySelector('[data-action="import"]');
    const originalLabel = button?.innerHTML;
    const setProgress = (percent) => {
      if (!button) return;
      button.disabled = true;
      button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${game.i18n.format(
        'sr4.importer.importing',
        { percent }
      )}`;
    };

    try {
      await game.settings.set('shadowrun4e', 'importerEnabledSources', [
        ...this.#enabledSources,
      ]);

      const skipDuplicates =
        this.element.querySelector('[name="skipDuplicates"]')?.checked ?? true;
      const checked = new Set(
        [...this.element.querySelectorAll('[data-group]:checked')].map(
          (input) => input.dataset.group
        )
      );

      const selected = this.#groups.filter(
        (group) => checked.has(group.id) && group.records.length > 0
      );
      const total = selected.reduce(
        (sum, group) => sum + group.records.length,
        0
      );

      let created = 0;
      let skipped = 0;
      let processed = 0;
      setProgress(0);

      /** @type {Map<string, string>} */
      const folderCache = new Map();
      /** @type {Map<string, string>} */
      const parentFolderCache = new Map();

      for (const group of selected) {
        let parentId = null;
        if (group.parentFolder) {
          if (!parentFolderCache.has(group.parentFolder)) {
            parentFolderCache.set(
              group.parentFolder,
              await this.#getOrCreateFolder(group.parentFolder)
            );
          }
          parentId = parentFolderCache.get(group.parentFolder);
        }

        const folderKey = `${group.parentFolder ?? ''}\0${group.typeLabel}`;
        if (!folderCache.has(folderKey)) {
          folderCache.set(
            folderKey,
            await this.#getOrCreateFolder(group.typeLabel, parentId)
          );
        }

        const pack = await this.#getOrCreatePack(
          group.compendiumName,
          group.compendiumLabel,
          folderCache.get(folderKey)
        );

        let known = new Set();
        if (skipDuplicates) {
          const index = await pack.getIndex();
          known = new Set([...index].map((e) => e.name.toLowerCase()));
        }

        const docs = [];
        for (const record of group.records) {
          const data = group.map(record);
          if (skipDuplicates && known.has(data.name.toLowerCase())) {
            skipped += 1;
            continue;
          }
          known.add(data.name.toLowerCase());
          docs.push(data);
        }

        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          await Item.createDocuments(docs.slice(i, i + CHUNK_SIZE), {
            pack: pack.collection,
          });
        }
        created += docs.length;
        processed += group.records.length;
        setProgress(total ? Math.round((processed / total) * 100) : 100);
      }

      ui.notifications.info(
        game.i18n.format('sr4.importer.result', { created, skipped })
      );
    } catch (err) {
      ui.notifications.error(
        game.i18n.format('sr4.importer.importError', { error: err.message })
      );
    } finally {
      this.#importing = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = originalLabel;
      }
    }
  }
}
