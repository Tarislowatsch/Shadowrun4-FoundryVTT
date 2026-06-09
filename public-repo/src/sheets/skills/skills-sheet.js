import {
  ActiveSkillCategories,
  KnowledgeSkillCategories,
  SR4Attributes,
} from '@models/index';

/**
 * Sheet class for displaying and editing Shadowrun 4e skill items.
 * Uses ApplicationV2 / HandlebarsApplicationMixin (Sheets V2).
 *
 * @extends {foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2)}
 */
export default class SR4SkillsSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'item', 'sheet-container'],
    position: { width: 1200, height: 600 },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    main: {
      template: 'systems/shadowrun4e/templates/sheets/skills/skill.sheet.hbs',
    },
  };

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  /**
   * @param {object} options
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.system = foundry.utils.deepClone(this.document._source.system);
    context.flags = this.document._source.flags;
    context.item = {
      ...this.document._source,
      system: context.system,
    };

    context.attributes = SR4Attributes;
    context.activeskillcategories = ActiveSkillCategories;
    context.knowledgeskillcategories = KnowledgeSkillCategories;

    return context;
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  /**
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    super._onRender?.(context, options);

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) => {
        input.addEventListener('focus', () => input.select());
      });
    this.element
      .querySelectorAll('input.sr4-checkbox[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener('change', async (e) => {
          const field = e.currentTarget.dataset.field;
          if (!field) return;
          await this.item.update({ [field]: e.currentTarget.checked });
        });
      });
    this.element
      .querySelector('[data-edit="img"]')
      ?.addEventListener('click', () => {
        new foundry.applications.apps.FilePicker.implementation({
          type: 'image',
          current: this.item.img,
          callback: (path) => this.item.update({ img: path }),
        }).browse();
      });
  }
}
