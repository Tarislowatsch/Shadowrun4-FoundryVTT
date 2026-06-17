import { handleAttackRoll, openActionDialog, reloadWeapon } from '@utils/index';

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
      openCreateItemDialog: SR4BaseActorSheet._onOpenCreateItemDialog,
      createItem: SR4BaseActorSheet._onCreateItem,
      deleteItem: SR4BaseActorSheet._onDeleteItem,
      editItem: SR4BaseActorSheet._onEditItem,
      toggleEquip: SR4BaseActorSheet._onToggleEquip,
      monitorBox: SR4BaseActorSheet._onMonitorBox,
      attackRoll: SR4BaseActorSheet._onAttackRoll,
      reloadWeapon: SR4BaseActorSheet._onReloadWeapon,
      editAmmo: SR4BaseActorSheet._onEditAmmo,
      toggleItemEffect: SR4BaseActorSheet._onToggleItemEffect,
      rollAction: SR4BaseActorSheet._onRollAction,
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

    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/shadowrun4e/templates/ui/edit-mode-toggle.hbs',
      { editMode: this.editMode }
    );
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

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) => {
        input.addEventListener('focus', () => input.select(), { signal });
      });

    this.element
      .querySelectorAll(
        '.item-list input, .item-list select, .weapon-list select'
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
  }

  // ---------------------------------------------------------------------------
  // Shared context helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static async _onOpenCreateItemDialog(_event, _target) {
    const types = [
      'Ranged Weapon',
      'Melee Weapon',
      'Armor',
      'Implant',
      'Commlink',
      'Gear',
      'Ammo',
      'Action',
    ];
    const options = types
      .map(
        (t) =>
          `<option value="${t}">${game.i18n.localize(`TYPES.Item.${t}`)}</option>`
      )
      .join('');
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize('sr4.item.create') },
      content: `<fieldset><select name="type" style="width:100%">${options}</select></fieldset>`,
      ok: {
        label: game.i18n.localize('sr4.item.create'),
        callback: (event, button) => button.form.elements.type.value,
      },
    });
    if (!result) return;
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      { name: game.i18n.localize(`TYPES.Item.${result}`), type: result },
    ]);
    item?.sheet?.render(true);
  }

  static async _onCreateItem(event, target) {
    const type = target.dataset.itemType;
    if (!type) return;
    const system = target.dataset.itemSubtype
      ? { type: target.dataset.itemSubtype }
      : {};
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      { name: game.i18n.localize(`TYPES.Item.${type}`), type, system },
    ]);
    item?.sheet?.render(true);
  }

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

  static async _onToggleEquip(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ 'system.equipped': !item.system.equipped });
  }

  static async _onMonitorBox(event, target) {
    const index = Number(target.dataset.index);
    const type =
      target.dataset.type ?? target.closest('.monitor-track')?.dataset.type;
    if (!type) return;
    const path = `system.conditionMonitor.${type}.value`;
    const current = foundry.utils.getProperty(this.actor, path);
    const newValue = index + 1 === current ? index : index + 1;
    await this.actor.update({ [path]: newValue });
  }

  static async _onAttackRoll(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const skillKey = target.dataset.attackSkill;
    if (!itemId || !skillKey) return;
    const weapon = this.actor.items.get(itemId);
    const skillName = this.actor.findByAttackSkill(skillKey)?.name;
    if (!skillName || !weapon) return;
    await handleAttackRoll(this.actor, skillName, weapon);
  }

  static async _onReloadWeapon(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    await reloadWeapon(this.actor, itemId);
  }

  static async _onEditAmmo(event, target) {
    const ammoId = target.dataset.ammoId;
    if (!ammoId) return;
    this.actor.items.get(ammoId)?.sheet?.render(true);
  }

  static async _onRollAction(event, target) {
    const rating1 = Number(target.dataset.rating1) || 0;
    const rating2 = Number(target.dataset.rating2) || 0;
    const action1 = target.dataset.action1;
    const action2 = target.dataset.action2;
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    const numDice = rating1 + rating2;

    if (!item || numDice < 1) {
      ui?.notifications?.error(
        game.i18n.localize('sr4.action.noRatingForAction')
      );
      return;
    }

    const actionName = `${item.name} (${action1}${action2 ? ` + ${action2}` : ''})`;
    openActionDialog(this.actor, actionName, numDice);
  }

  static async _onToggleItemEffect(event, target) {
    const itemId = target.dataset.itemId;
    const effectId = target.dataset.effectId;
    if (!itemId || !effectId) return;
    const item = this.actor.items.get(itemId);
    const effect = item?.effects.get(effectId);
    if (!effect) return;
    await effect.update({ disabled: !effect.disabled });
  }
}
