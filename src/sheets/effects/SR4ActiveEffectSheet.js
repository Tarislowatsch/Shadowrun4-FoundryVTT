import { SR4EffectTargets } from '@effects/index.js';

/** @type {Record<number, string>} Maps Foundry AE mode number → display key */
const MODE_NAMES = { 1: 'multiply', 2: 'add', 5: 'override' };
/** @type {Record<string, number>} Maps display key → Foundry AE mode number */
const MODE_NUMBERS = { multiply: 1, add: 2, override: 5 };

export default class SR4ActiveEffectSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @type {foundry.documents.ActiveEffect} */
  document;

  constructor(options = {}) {
    if (options.document) {
      options.id = `sr4-effect-${options.document.id}`;
    }
    super(options);
    this.document = options.document;
  }

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

  async _prepareContext(options) {
    const change = this.document.changes[0] ?? {};
    const modeKey = MODE_NAMES[change.mode] ?? 'add';
    return {
      name: this.document.name,
      img: this.document.img ?? 'icons/svg/aura.svg',
      active: !this.document.disabled,
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

  static async #onSave(event, target) {
    const form = this.element.querySelector('form');
    if (!form) return;
    const name = form.querySelector('[name="name"]')?.value ?? '';
    const img =
      form.querySelector('[name="img"]')?.value ?? 'icons/svg/aura.svg';
    const active = form.querySelector('[name="active"]')?.checked ?? true;
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
      description,
      changes: [
        {
          key: changeKey,
          mode: MODE_NUMBERS[changeModeKey] ?? 2,
          value: changeValue,
        },
      ],
    });
    this.close();
  }
}
