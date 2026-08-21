import { TEMPLATES } from '@utils/templates';
import {
  ActiveSkillCategories,
  KnowledgeSkillCategories,
  SR4Attributes,
} from '@models/index';
import {
  cancelItemName,
  confirmItemName,
  editItemName,
  resetItemName,
} from '../shared';

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
    actions: {
      editItemName: SR4SkillsSheet.#onEditItemName,
      confirmItemName: SR4SkillsSheet.#onConfirmItemName,
      cancelItemName: SR4SkillsSheet.#onCancelItemName,
      resetItemName: SR4SkillsSheet.#onResetItemName,
    },
  };

  static PARTS = {
    main: {
      template: TEMPLATES.sheets.skills.skill,
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

  static #onEditItemName(event, target) {
    editItemName(target);
  }

  static async #onConfirmItemName(event, target) {
    await confirmItemName(target, this.item);
  }

  static #onCancelItemName(event, target) {
    cancelItemName(target);
  }

  static async #onResetItemName(event, target) {
    await resetItemName(this.item);
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
