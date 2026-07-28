// @ts-nocheck
import { TEMPLATES } from '@utils/templates';
import { extractRecords } from '@importer/xml/parse-xml.js';
import { buildImportGroups, buildTypeTree } from '@importer/pack/grouping.js';
import { parseTranslationData } from '@importer/translation/parse-name-translations.js';
import { buildGuidTranslationMap } from '@importer/translation/reference-pack-translation.js';
import {
  buildExistingItemIndex,
  addToExistingItemIndex,
} from '@importer/pack/existing-item-match.js';
import { planGroupImport } from '@importer/pack/plan-group-import.js';
import {
  detectLanguageFromFilename,
  normalizeLangCode,
} from '@importer/translation/detect-language.js';
import { openTranslatePackDialog } from '@sheets/importer/translate-pack-dialog.js';
import {
  mergeItemNameTranslationEntries,
  registerItemNameTranslations,
} from '@utils/item-name-translations.js';

/** @type {number} */
const CHUNK_SIZE = 100;

export class XmlImporterApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @type {import('@importer/pack/grouping.js').ImportGroup[]} */
  #groups = [];

  /** @type {string[]} */
  #availableSources = [];

  /** @type {Set<string>} */
  #enabledSources = new Set();

  /** @type {boolean} */
  #importing = false;

  /** @type {import('@importer/translation/parse-name-translations.js').TranslationData | null} */
  #translationData = null;

  /** @type {File[]} */
  #selectedFiles = [];

  /** @type {File | null} */
  #selectedTranslationFile = null;

  /** @type {string | null} */
  #translationLang = null;

  /** @type {string} */
  #referencePackId = '';

  /** @type {Map<string, import('@importer/translation/reference-pack-translation.js').GuidTranslation> | null} */
  #guidMap = null;

  static DEFAULT_OPTIONS = {
    id: 'sr4-xml-importer',
    window: {
      title: 'sr4.importer.title',
      icon: 'fas fa-file-import',
      resizable: true,
    },
    position: { width: 640, height: 720 },
    actions: {
      import: XmlImporterApp.#onImport,
      translateExisting: XmlImporterApp.#onTranslateExisting,
    },
  };

  static PARTS = {
    form: {
      template: TEMPLATES.sheets.importer.importer,
      scrollable: ['', '.preview'],
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
    const translationCount = this.#translationData?.names.size ?? 0;
    const translationLang = this.#translationLang ?? '';

    const referencePacks = game.packs
      .filter(
        (p) => p.metadata.type === 'Item' && p.metadata.packageType === 'world'
      )
      .map((p) => ({
        id: p.collection,
        label: p.metadata.label,
        selected: p.collection === this.#referencePackId,
      }));

    return {
      types,
      hasData,
      sources,
      hasSources,
      translationData: Boolean(this.#translationData),
      translationCount,
      translationLang,
      referencePacks,
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);

    const filesInput = this.element.querySelector('[data-files]');
    filesInput?.addEventListener('change', this.#onFilesSelected.bind(this));
    this.#restoreSelectedFiles(filesInput, this.#selectedFiles);

    const translationInput = this.element.querySelector(
      '[data-translation-file]'
    );
    translationInput?.addEventListener(
      'change',
      this.#onTranslationFileSelected.bind(this)
    );
    this.#restoreSelectedFiles(
      translationInput,
      this.#selectedTranslationFile ? [this.#selectedTranslationFile] : []
    );

    const translationLangInput = this.element.querySelector(
      '[data-translation-lang]'
    );
    translationLangInput?.addEventListener('change', (event) => {
      this.#translationLang = normalizeLangCode(event.target.value);
    });

    const referencePackSelect = this.element.querySelector(
      '[data-reference-pack]'
    );
    referencePackSelect?.addEventListener(
      'change',
      this.#onReferencePackSelected.bind(this)
    );

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

  // Workaround: browsers clear an <input type="file">'s files when it's re-created by render().
  /**
   * @param {HTMLInputElement | null | undefined} input
   * @param {File[]} files
   */
  #restoreSelectedFiles(input, files) {
    if (!input || files.length === 0) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
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
   * @param {string} toggleSelector
   * @param {string} childSelector
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
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async #onFilesSelected(event) {
    const files = [...(event.target.files ?? [])];
    if (files.length === 0) return;
    this.#selectedFiles = files;

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
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async #onTranslationFileSelected(event) {
    const file = event.target.files?.[0];
    this.#selectedTranslationFile = file ?? null;
    if (!file) {
      this.#translationData = null;
      this.#translationLang = null;
      await this.render();
      return;
    }

    this.#translationLang = detectLanguageFromFilename(file.name);
    if (!this.#translationLang) {
      ui.notifications.warn(
        game.i18n.format('sr4.importer.translationLangUnknown', {
          file: file.name,
        })
      );
    }

    try {
      this.#translationData = parseTranslationData(await file.text());
      ui.notifications.info(
        game.i18n.format('sr4.importer.translationLoaded', {
          count: this.#translationData.names.size,
          file: file.name,
        })
      );
    } catch (err) {
      ui.notifications.warn(
        game.i18n.format('sr4.importer.translationParseError', {
          file: file.name,
          error: err.message,
        })
      );
      this.#translationData = null;
    }

    await this.render();
  }

  /**
   * @this {XmlImporterApp}
   * @returns {Promise<void>}
   */
  static async #onTranslateExisting() {
    await openTranslatePackDialog(
      this.#translationData && this.#translationLang
        ? {
            file: this.#selectedTranslationFile,
            translations: this.#translationData,
            lang: this.#translationLang,
          }
        : undefined
    );
  }

  /**
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async #onReferencePackSelected(event) {
    this.#referencePackId = event.target.value ?? '';
    if (!this.#referencePackId) {
      this.#guidMap = null;
      return;
    }

    const pack = game.packs.get(this.#referencePackId);
    if (!pack) {
      this.#guidMap = null;
      return;
    }

    this.#guidMap = await buildGuidTranslationMap(pack);
    ui.notifications.info(
      game.i18n.format('sr4.importer.referencePackLoaded', {
        count: this.#guidMap.size,
        pack: pack.metadata.label,
      })
    );
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
   * @this {XmlImporterApp}
   * @returns {Promise<void>}
   */
  static async #onImport() {
    if (this.#importing) return;

    if (this.#translationData && !this.#translationLang) {
      ui.notifications.error(
        game.i18n.format('sr4.importer.translationLangUnknown', {
          file: this.#selectedTranslationFile?.name ?? '',
        })
      );
      return;
    }

    const updateExisting =
      this.element.querySelector('[data-update-existing]')?.checked ?? false;
    if (updateExisting) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize('sr4.importer.updateExisting') },
        content: `<p>${game.i18n.localize('sr4.importer.updateExistingConfirm')}</p>`,
      });
      if (!confirmed) return;
    }

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
      let updated = 0;
      let skipped = 0;
      let processed = 0;
      setProgress(0);

      /** @type {Map<string, string>} */
      const folderCache = new Map();
      /** @type {Map<string, string>} */
      const parentFolderCache = new Map();
      /** @type {Map<string, import('@importer/pack/existing-item-match.js').ExistingItemIndex>} */
      const existingIndexCache = new Map();
      /** @type {Record<string, import('@utils/item-name-translations.js').LabelTranslations>} */
      let translationLabels = {};

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

        let existingIndex = null;
        if (updateExisting) {
          if (!existingIndexCache.has(pack.collection)) {
            const index = await pack.getIndex({
              fields: ['system.chummerId', 'system.label', 'system.nameEn'],
            });
            existingIndexCache.set(
              pack.collection,
              buildExistingItemIndex([...index])
            );
          }
          existingIndex = existingIndexCache.get(pack.collection);
        }

        const {
          docs,
          updates,
          translationEntries,
          addedKnownNames,
          skippedCount,
        } = planGroupImport(group, {
          translationData: this.#translationData,
          lang: this.#translationLang,
          guidMap: this.#guidMap,
          existingIndex,
          skipDuplicates,
          known,
        });
        for (const name of addedKnownNames) known.add(name);
        skipped += skippedCount;
        if (translationEntries.length) {
          translationLabels = mergeItemNameTranslationEntries(
            translationLabels,
            translationEntries
          );
        }

        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const createdDocs = await Item.createDocuments(
            docs.slice(i, i + CHUNK_SIZE),
            { pack: pack.collection }
          );
          if (existingIndex) {
            for (const doc of createdDocs) {
              addToExistingItemIndex(existingIndex, doc);
            }
          }
        }
        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
          await Item.updateDocuments(updates.slice(i, i + CHUNK_SIZE), {
            pack: pack.collection,
          });
        }
        created += docs.length;
        updated += updates.length;
        processed += group.records.length;
        setProgress(total ? Math.round((processed / total) * 100) : 100);
      }

      await registerItemNameTranslations(
        Object.entries(translationLabels).map(([label, translations]) => ({
          label,
          translations,
        }))
      );

      ui.notifications.info(
        game.i18n.format('sr4.importer.result', { created, updated, skipped })
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
