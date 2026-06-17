import { SR4EffectTargets } from '@effects/index.js';

/**
 * @typedef {object} SR4ActiveEffectSheetOptions
 * @property {foundry.documents.ActiveEffect} [document] - The ActiveEffect document to edit.
 */

export default class SR4ActiveEffectSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2
) {
  /**
   * @param {SR4ActiveEffectSheetOptions} [options]
   */
  constructor(options = {}) {
    if (options.document) {
      options.id = `sr4-effect-${options.document.id}`;
    }
    super(options);
  }

  /** @returns {string} */
  get title() {
    return this.document?.name ?? 'Effect';
  }

  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'item-form', 'effect'],
    window: { resizable: false },
    actions: {
      saveEffect: SR4ActiveEffectSheet.#onSave,
      pickImage: SR4ActiveEffectSheet.#onPickImage,
    },
  };

  static PARTS = {
    form: {
      template:
        'systems/shadowrun4e/templates/sheets/effects/effect-config.hbs',
    },
  };

  /**
   * @param {object} options
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const change = this.document.changes[0] ?? {};
    const modeKey = change.type ?? 'add';
    return {
      name: this.document.name,
      img: this.document.img ?? 'icons/svg/aura.svg',
      active: !this.document.disabled,
      durationTurns: this.document.duration?.turns ?? 0,
      showOnToken: !!this.document.flags?.sr4?.showOnToken,
      changeKey: change.key ?? 'system.modifiers.generalModifier',
      changeMode: modeKey,
      changeValue: Number(change.value ?? 0),
      description: this.document.description ?? '',
      effectTargets: SR4EffectTargets,
      changeModes: {
        add: 'sr4.effect.mode.add',
        multiply: 'sr4.effect.mode.multiply',
        override: 'sr4.effect.mode.override',
      },
    };
  }

  /**
   * @param {Event} event
   * @param {HTMLImageElement} target
   * @returns {void}
   */
  static #onPickImage(event, target) {
    const form = this.element.querySelector('form');
    const imgInput = form?.querySelector('[name="img"]');
    new FilePicker({
      type: 'image',
      current: imgInput?.value ?? 'icons/svg/aura.svg',
      callback: (path) => {
        if (imgInput) imgInput.value = path;
        target.src = path;
      },
    }).render(true);
  }

  /**
   * @param {Event} event
   * @param {HTMLElement} target
   * @returns {Promise<void>}
   */
  static async #onSave(event, target) {
    const form = this.element.querySelector('form');
    if (!form) return;
    const name = form.querySelector('[name="name"]')?.value ?? '';
    const img =
      form.querySelector('[name="img"]')?.value ?? 'icons/svg/aura.svg';
    const active = form.querySelector('[name="active"]')?.checked ?? true;
    const durationTurns = Number(
      form.querySelector('[name="durationTurns"]')?.value ?? 0
    );
    const showOnToken =
      form.querySelector('[name="showOnToken"]')?.checked ?? false;
    const changeKey =
      form.querySelector('[name="changeKey"]')?.value ??
      'system.modifiers.generalModifier';
    const changeModeKey =
      form.querySelector('[name="changeMode"]')?.value ?? 'add';
    const changeValue =
      form.querySelector('[name="changeValue"]')?.value ?? '0';
    const description = form.querySelector('[name="description"]')?.value ?? '';
    await this.document.update({
      name,
      img,
      disabled: !active,
      'flags.sr4.showOnToken': showOnToken,
      duration: { turns: durationTurns > 0 ? durationTurns : undefined },
      description,
      changes: [
        {
          key: changeKey,
          type: changeModeKey,
          value: changeValue,
        },
      ],
    });
    this.close();
  }
}
