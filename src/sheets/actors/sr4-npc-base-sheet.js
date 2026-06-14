import { openActionDialog } from '@utils/index';

export class SR4NpcBaseSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  /** @type {boolean} */
  editMode = false;

  _listenerAbort = new AbortController();

  static DEFAULT_OPTIONS = {
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      deleteItem: SR4NpcBaseSheet._onDeleteItem,
      editItem: SR4NpcBaseSheet._onEditItem,
    },
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolves a Foundry UUID to the actor's name, or falls back to the raw UUID.
   * Returns null when uuid is empty.
   * @param {string} uuid
   * @returns {Promise<string | null>}
   */
  async _resolveLinkedActorName(uuid) {
    if (!uuid) return null;
    try {
      // @ts-ignore — fromUuid is a Foundry VTT global
      const actor = await fromUuid(uuid);
      return actor?.name ?? uuid;
    } catch {
      return uuid;
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const headerControls = frame.querySelector(
      '.window-header .header-control'
    );
    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/shadowrun4e/templates/ui/edit-mode-toggle.hbs',
      { editMode: this.editMode }
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const toggle = /** @type {HTMLElement} */ (wrapper.firstElementChild);
    toggle.querySelector('input')?.addEventListener('change', (ev) => {
      ev.stopPropagation();
      this.editMode = /** @type {HTMLInputElement} */ (
        ev.currentTarget
      ).checked;
      this.render();
    });
    if (headerControls?.parentElement) {
      headerControls.parentElement.prepend(toggle);
    }
    return frame;
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  _onRender(context, options) {
    super._onRender?.(context, options);

    this._listenerAbort.abort();
    this._listenerAbort = new AbortController();
    const { signal } = this._listenerAbort;

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) =>
        input.addEventListener('focus', () => input.select(), { signal })
      );

    this.element.querySelector('[data-edit="img"]')?.addEventListener(
      'click',
      () => {
        new foundry.applications.apps.FilePicker.implementation({
          type: 'image',
          current: this.actor.img,
          callback: (path) => this.actor.update({ img: path }),
        }).browse();
      },
      { signal }
    );

    // Generic drag-drop: reads data-drop-type from the zone to determine
    // which system field to update (e.g. data-drop-type="ownerUuid").
    this.element.querySelectorAll('.actor-drop-zone').forEach((zone) => {
      zone.addEventListener(
        'dragover',
        (e) => {
          e.preventDefault();
          zone.classList.add('dragover');
        },
        { signal }
      );
      zone.addEventListener(
        'dragleave',
        () => zone.classList.remove('dragover'),
        { signal }
      );
      zone.addEventListener(
        'drop',
        async (e) => {
          e.preventDefault();
          zone.classList.remove('dragover');
          // @ts-ignore — TextEditor is a Foundry VTT global
          const data = TextEditor.getDragEventData(e);
          if (data?.type === 'Actor') {
            const field = zone.dataset.dropType;
            if (field)
              await this.actor.update({ [`system.${field}`]: data.uuid });
          }
        },
        { signal }
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Actions (shared)
  // ---------------------------------------------------------------------------

  static async _onDeleteItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  static async _onEditItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    this.actor.items.get(itemId)?.sheet?.render(true);
  }
}
