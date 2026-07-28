import { TEMPLATES, renderTemplate } from '@utils/templates';
import {
  wireFocusSelectListeners,
  wireImageEditListener,
} from '@sheets/shared';
import {
  onOpenCreateItemDialog,
  onCreateItem,
  onDeleteItem,
  onEditItem,
  onToggleEquip,
  onMonitorBox,
  onEditAmmo,
  onCreateMod,
  onRemoveMod,
  onToggleItemEffect,
} from './item-crud-actions.js';
import {
  onAttackRoll,
  onReloadWeapon,
  onRollAction,
  onRollDerivedStat,
  onRollAttribute,
} from './roll-actions.js';
import {
  onCreateElementResistance,
  onDeleteElementResistance,
} from './resistance-actions.js';

export default class SR4BaseActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  /** @type {boolean} */
  editMode = false;

  _listenerAbort = new AbortController();

  static DEFAULT_OPTIONS = {
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      openCreateItemDialog: onOpenCreateItemDialog,
      createItem: onCreateItem,
      deleteItem: onDeleteItem,
      editItem: onEditItem,
      toggleEquip: onToggleEquip,
      monitorBox: onMonitorBox,
      attackRoll: onAttackRoll,
      reloadWeapon: onReloadWeapon,
      editAmmo: onEditAmmo,
      removeMod: onRemoveMod,
      createMod: onCreateMod,
      toggleItemEffect: onToggleItemEffect,
      rollAction: onRollAction,
      rollDerivedStat: onRollDerivedStat,
      rollAttribute: onRollAttribute,
      createElementResistance: onCreateElementResistance,
      deleteElementResistance: onDeleteElementResistance,
    },
  };

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    const headerControls = frame.querySelector(
      '.window-header .header-control'
    );

    const html = await renderTemplate(TEMPLATES.ui.editModeToggle, {
      editMode: this.editMode,
    });
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const toggle = /** @type {HTMLElement} */ (wrapper.firstElementChild);

    toggle.querySelector('input')?.addEventListener('change', (ev) => {
      // @ts-ignore — checked exists on HTMLInputElement at runtime
      const input = /** @type {HTMLInputElement} */ (ev.currentTarget);
      // stopPropagation: the outer element is a <form> (tag:"form" in DocumentSheetV2).
      // Without this, the change event bubbles to the form and triggers submitOnChange,
      // causing a duplicate actor-update render on top of our own render() call.
      ev.stopPropagation();
      this.editMode = input.checked;
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

    wireFocusSelectListeners(this.element, { signal });

    this.element
      .querySelectorAll(
        '.item-list input, .item-list select:not(.mod-add-select), .weapon-list select:not(.mod-add-select)'
      )
      .forEach((el) => {
        el.addEventListener(
          'change',
          async (event) => {
            const target = event.currentTarget;
            const itemEl = target.closest('.item');
            if (!itemEl) return;
            const itemId = itemEl.dataset.itemId;
            const item = this.actor.items.get(itemId);
            if (!item) return;
            const field = target.name;
            let value = target.value;
            if (target.type === 'checkbox') {
              value = target.checked;
            } else if (target.dataset.dtype === 'Number') {
              value = Number(value);
            }
            if (item.type === 'Skill') {
              event.stopPropagation();
              await item.update({ [field]: value }, { render: false });
              return;
            }
            await item.update({ [field]: value });
          },
          { signal }
        );
      });

    // Installing a mod updates the host item; stop the change from reaching the
    // actor form, whose submitOnChange would re-validate the whole actor.
    this.element.querySelectorAll('.mod-add-select').forEach((el) => {
      el.addEventListener(
        'change',
        async (event) => {
          event.stopPropagation();
          const target = event.currentTarget;
          const modId = target.value;
          const hostId = target.closest('[data-item-id]')?.dataset.itemId;
          if (!modId || !hostId) return;
          const host = this.actor.items.get(hostId);
          const current = host?.system.installedModIds ?? [];
          if (!host || current.includes(modId)) return;
          await host.update({
            'system.installedModIds': [...current, modId],
          });
        },
        { signal }
      );
    });

    wireImageEditListener(this.element, this.actor, { signal });
  }

  // ---------------------------------------------------------------------------
  // Shared context helpers
  // ---------------------------------------------------------------------------

  _getSourceContext() {
    const src = this.document.toObject().system;
    return { sourceStats: src.sheetStats, sourceModifiers: src.modifiers };
  }

  /** @param {object} actorData */
  _getBaseActorContext(actorData) {
    return {
      actor: { img: actorData.img, name: actorData.name, uuid: actorData._id },
      system: actorData.system,
      flags: actorData.flags,
      // @ts-ignore — CONFIG.SR4 is registered at runtime by the system
      config: CONFIG.SR4,
    };
  }

  _enrichItemContext(items, type) {
    const actions = items.filter((i) => i.type === 'Action');
    return items
      .filter((i) => i.type === type)
      .map((item) => {
        item.linkedActions = actions
          .filter((a) => a.system.linkedItemId === item._id)
          .map((a) => ({ id: a._id, name: a.name, system: a.system }));
        const liveItem = this.actor.items.get(item._id);
        item.itemEffects = (liveItem?.effects.contents ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          active: !e.disabled,
          itemId: item._id,
        }));
        return item;
      });
  }
}
