// @ts-nocheck
import { extractCharacter } from '@importer/parse-character.js';
import { buildActorData } from '@importer/build-character.js';
import { SR4Actor } from '@documents/actor.js';

/**
 * GM-facing tool that reads a single Chummer character XML export and creates a
 * full SR4 `character` actor — attributes, skills (with ratings), magic,
 * qualities, gear, weapons, armor, spells, powers and implants. Separate from
 * the compendium-oriented {@link XmlImporterApp}.
 */
export class CharacterImporterApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @type {import('@importer/parse-character.js').ParsedCharacter | null} */
  #parsed = null;

  static DEFAULT_OPTIONS = {
    id: 'sr4-character-importer',
    window: {
      title: 'sr4.characterImporter.title',
      icon: 'fas fa-user-plus',
      resizable: true,
    },
    position: { width: 460, height: 'auto' },
    actions: {
      import: CharacterImporterApp.#onImport,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/importer/character-importer.hbs',
    },
  };

  /** @override */
  async _prepareContext() {
    const c = this.#parsed?.character;
    if (!c) return { hasData: false };

    const attributes = c.attributes ?? {};
    return {
      hasData: true,
      name: c.name,
      metatype: c.metatype,
      attributes: Object.entries(attributes).map(([key, value]) => ({
        key,
        value,
      })),
      itemCount: Object.values(this.#parsed.items ?? {}).reduce(
        (sum, list) => sum + list.length,
        0
      ),
      skillCount: (this.#parsed.skills ?? []).length,
      portrait: String(c.mugshotbase64 ?? '').trim()
        ? `data:image/jpeg;base64,${c.mugshotbase64}`
        : null,
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element
      .querySelector('[data-file]')
      ?.addEventListener('change', this.#onFileSelected.bind(this));
  }

  /**
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async #onFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      this.#parsed = extractCharacter(await file.text());
    } catch (err) {
      this.#parsed = null;
      ui.notifications.error(
        game.i18n.format('sr4.characterImporter.parseError', {
          file: file.name,
          error: err.message,
        })
      );
    }
    await this.render();
  }

  /**
   * @this {CharacterImporterApp}
   * @returns {Promise<void>}
   */
  static async #onImport() {
    if (!this.#parsed) return;

    const canonicalSkills = await SR4Actor.buildCompendiumSkillData(false);
    const data = buildActorData(this.#parsed, canonicalSkills);
    if (!data.img) delete data.img;

    try {
      const actor = await Actor.create(data, { renderSheet: true });
      if (actor) {
        ui.notifications.info(
          game.i18n.format('sr4.characterImporter.success', {
            name: actor.name,
          })
        );
        this.close();
      }
    } catch (err) {
      ui.notifications.error(
        game.i18n.format('sr4.characterImporter.createError', {
          error: err.message,
        })
      );
    }
  }
}
