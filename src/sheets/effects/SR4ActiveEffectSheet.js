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
      addChange: SR4ActiveEffectSheet.#onAddChange,
      removeChange: SR4ActiveEffectSheet.#onRemoveChange,
    },
  };

  static PARTS = {
    form: {
      template:
        'systems/shadowrun4e/templates/sheets/effects/effect-config.hbs',
    },
  };

  /**
   * @param {object} _options
   * @returns {Promise<object>}
   */
  async _prepareContext(_options) {
    const rawChanges = this.document.changes;
    const changes =
      rawChanges.length > 0
        ? rawChanges.map((c) => ({
            key: c.key ?? 'system.modifiers.generalModifier',
            mode: c.type ?? 'add',
            value: Number(c.value ?? 0),
          }))
        : [
            {
              key: 'system.modifiers.generalModifier',
              mode: 'add',
              value: 0,
            },
          ];

    return {
      name: this.document.name,
      img: this.document.img ?? 'icons/svg/aura.svg',
      active: !this.document.disabled,
      durationTurns: this.document.duration?.turns ?? 0,
      showOnToken: !!this.document.flags?.sr4?.showOnToken,
      changes,
      multipleChanges: changes.length > 1,
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
   * @param {Event} _event
   * @param {HTMLElement} _target
   */
  static #onAddChange(_event, _target) {
    const tbody = this.element.querySelector('.changes-body');
    if (!tbody) return;
    const firstRow = tbody.querySelector('.change-row');
    if (!firstRow) return;
    const newRow = /** @type {HTMLElement} */ (firstRow.cloneNode(true));
    newRow.querySelector('[name="changeKey"]').value =
      'system.modifiers.generalModifier';
    newRow.querySelector('[name="changeMode"]').value = 'add';
    newRow.querySelector('[name="changeValue"]').value = '0';
    tbody.appendChild(newRow);
    SR4ActiveEffectSheet.#updateRemoveButtons.call(this);
  }

  /**
   * @param {Event} _event
   * @param {HTMLElement} target
   */
  static #onRemoveChange(_event, target) {
    const row = target.closest('.change-row');
    const tbody = this.element.querySelector('.changes-body');
    if (!row || !tbody) return;
    if (tbody.querySelectorAll('.change-row').length <= 1) return;
    row.remove();
    SR4ActiveEffectSheet.#updateRemoveButtons.call(this);
  }

  static #updateRemoveButtons() {
    const tbody = this.element.querySelector('.changes-body');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('.change-row');
    const single = rows.length <= 1;
    rows.forEach((row) => {
      const btn = row.querySelector('.remove-change-btn');
      if (btn) btn.style.visibility = single ? 'hidden' : '';
    });
  }

  /**
   * @param {Event} _event
   * @param {HTMLElement} _target
   * @returns {Promise<void>}
   */
  static async #onSave(_event, _target) {
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
    const description = form.querySelector('[name="description"]')?.value ?? '';

    const changeRows = form.querySelectorAll('.change-row');
    const changes = [...changeRows].map((row) => ({
      key:
        row.querySelector('[name="changeKey"]')?.value ??
        'system.modifiers.generalModifier',
      type: row.querySelector('[name="changeMode"]')?.value ?? 'add',
      value: row.querySelector('[name="changeValue"]')?.value ?? '0',
    }));

    await this.document.update({
      name,
      img,
      disabled: !active,
      'flags.sr4.showOnToken': showOnToken,
      duration: { turns: durationTurns > 0 ? durationTurns : undefined },
      description,
      changes,
    });
    this.close();
  }
}
