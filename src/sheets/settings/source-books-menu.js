// @ts-nocheck
import { getSourceBookBindings } from '@utils/pdf-source.js';

export class SourceBooksMenu extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  #rows = null;

  static DEFAULT_OPTIONS = {
    id: 'sr4-source-books-menu',
    window: {
      title: 'sr4.settings.sourceBooksMenu.title',
      resizable: true,
    },
    position: { width: 520, height: 'auto' },
    actions: {
      addRow: SourceBooksMenu.#onAddRow,
      removeRow: SourceBooksMenu.#onRemoveRow,
      save: SourceBooksMenu.#onSave,
      reset: SourceBooksMenu.#onReset,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/settings/source-books-menu.hbs',
    },
  };

  async _prepareContext() {
    if (!this.#rows) {
      const saved = getSourceBookBindings();
      this.#rows = Object.entries(saved).map(([code, uuid]) => ({
        code,
        uuid,
      }));
    }
    if (this.#rows.length === 0) this.#rows.push({ code: '', uuid: '' });

    const pdfPages = [];
    for (const journal of game.journal.contents) {
      const pages = journal.pages.filter((page) => page.type === 'pdf');
      for (const page of pages) {
        pdfPages.push({
          uuid: page.uuid,
          label:
            pages.length > 1 ? `${journal.name} — ${page.name}` : journal.name,
        });
      }
    }
    pdfPages.sort((a, b) => a.label.localeCompare(b.label));

    return {
      rows: this.#rows.map((row, index) => ({
        index,
        code: row.code,
        pages: pdfPages.map((page) => ({
          ...page,
          selected: page.uuid === row.uuid,
        })),
      })),
    };
  }

  #syncRowsFromDom() {
    const codeInputs = this.element.querySelectorAll('input[name^="code-"]');
    this.#rows = Array.from(codeInputs).map((input) => {
      const index = input.name.split('-')[1];
      const select = this.element.querySelector(`select[name="page-${index}"]`);
      return { code: input.value, uuid: select?.value ?? '' };
    });
  }

  static #onAddRow() {
    this.#syncRowsFromDom();
    this.#rows.push({ code: '', uuid: '' });
    this.render();
  }

  static #onRemoveRow(_event, target) {
    this.#syncRowsFromDom();
    const index = Number(target.closest('[data-row-index]')?.dataset.rowIndex);
    this.#rows.splice(index, 1);
    this.render();
  }

  static async #onSave() {
    this.#syncRowsFromDom();
    const result = {};
    for (const row of this.#rows) {
      if (row.code.trim() && row.uuid) result[row.code.trim()] = row.uuid;
    }
    await game.settings.set(
      'shadowrun4e',
      'sourceBookBindings',
      JSON.stringify(result)
    );
    this.close();
  }

  static async #onReset() {
    await game.settings.set('shadowrun4e', 'sourceBookBindings', '{}');
    this.#rows = [{ code: '', uuid: '' }];
    this.render();
  }
}
