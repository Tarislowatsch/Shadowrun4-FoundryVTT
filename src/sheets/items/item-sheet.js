import {
  ImplantGrades,
  ImplantTypes,
  RangedAttackskill,
  MeleeAttackskill,
  DamageTypes,
  Shootingmodes,
  WeaponMountPoints,
  WeaponCategory,
  AmmoCategory,
  SpellTypes,
  SpellCategories,
  SpellCombatTypes,
  SpellRanges,
  SpellDurations,
  SpellElements,
  ActionType,
} from '@models/index';
import { SR4EffectTargets, EFFECT_TEMPLATES } from '@effects/index';
import SR4ActiveEffectSheet from '@sheets/effects/SR4ActiveEffectSheet';
import {
  buildModPoolFromCollection,
  resolveModsAndAvailability,
} from '@sheets/shared/mod-resolution';

export default class SR4ItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(
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
      editItem: SR4ItemSheet.#onEditItem,
      deleteItem: SR4ItemSheet.#onDeleteItem,
      createLinkedAction: SR4ItemSheet.#onCreateLinkedAction,
      createEffect: SR4ItemSheet.#onCreateEffect,
      addEffectTemplate: SR4ItemSheet.#onAddEffectTemplate,
      toggleEffect: SR4ItemSheet.#onToggleEffect,
      editEffect: SR4ItemSheet.#onEditEffect,
      deleteEffect: SR4ItemSheet.#onDeleteEffect,
      addMod: SR4ItemSheet.#onAddMod,
      removeMod: SR4ItemSheet.#onRemoveMod,
      createMod: SR4ItemSheet.#onCreateMod,
    },
  };

  static PARTS = {
    ammo: {
      template: 'systems/shadowrun4e/templates/sheets/items/ammo.sheet.hbs',
    },
    action: {
      template: 'systems/shadowrun4e/templates/sheets/items/action.sheet.hbs',
    },
    gear: {
      template: 'systems/shadowrun4e/templates/sheets/items/gear.sheet.hbs',
    },
    armor: {
      template: 'systems/shadowrun4e/templates/sheets/items/armor.sheet.hbs',
    },
    implant: {
      template: 'systems/shadowrun4e/templates/sheets/items/implant.sheet.hbs',
    },
    spell: {
      template: 'systems/shadowrun4e/templates/sheets/items/spell.sheet.hbs',
    },
    item: {
      template: 'systems/shadowrun4e/templates/sheets/items/item.sheet.hbs',
    },
    rangedweapon: {
      template:
        'systems/shadowrun4e/templates/sheets/items/rangedweapon.sheet.hbs',
    },
    meleeweapon: {
      template:
        'systems/shadowrun4e/templates/sheets/items/meleeweapon.sheet.hbs',
    },
    power: {
      template: 'systems/shadowrun4e/templates/sheets/items/power.sheet.hbs',
    },
    autosoft: {
      template: 'systems/shadowrun4e/templates/sheets/items/autosoft.sheet.hbs',
    },
    critterpower: {
      template:
        'systems/shadowrun4e/templates/sheets/items/critterpower.sheet.hbs',
    },
    commlink: {
      template: 'systems/shadowrun4e/templates/sheets/items/commlink.sheet.hbs',
    },
    program: {
      template: 'systems/shadowrun4e/templates/sheets/items/program.sheet.hbs',
    },
    quality: {
      template: 'systems/shadowrun4e/templates/sheets/items/quality.sheet.hbs',
    },
    weaponmod: {
      template:
        'systems/shadowrun4e/templates/sheets/items/weaponmod.sheet.hbs',
    },
    armormod: {
      template: 'systems/shadowrun4e/templates/sheets/items/armormod.sheet.hbs',
    },
    vehiclemod: {
      template:
        'systems/shadowrun4e/templates/sheets/items/vehiclemod.sheet.hbs',
    },
    metatype: {
      template: 'systems/shadowrun4e/templates/sheets/items/metatype.sheet.hbs',
    },
    crittertemplate: {
      template:
        'systems/shadowrun4e/templates/sheets/items/crittertemplate.sheet.hbs',
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    let type = this.item.type.replace(/\s+/g, '').toLowerCase();
    if (!(type in this.constructor.PARTS)) {
      type = 'item';
    }
    options.parts = [type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = this.document.toObject(false);

    context.system = foundry.utils.deepClone(this.document._source.system);
    context.flags = itemData.flags;
    context.item = itemData;

    context.implantgrades = ImplantGrades;
    context.implanttypes = ImplantTypes;
    context.damagetypes = DamageTypes;
    context.rangedattackskills = RangedAttackskill;
    context.meleeattackskills = MeleeAttackskill;
    context.shootingmodes = Shootingmodes;
    context.actiontypes = ActionType;
    context.spelltypes = SpellTypes;
    context.spellcategories = SpellCategories;
    context.spellcombattypes = SpellCombatTypes;
    context.spellranges = SpellRanges;
    context.spellelements = SpellElements;
    context.spelldurations = SpellDurations;
    context.weaponcategories = WeaponCategory;
    context.ammocategories = AmmoCategory;

    if (this.item.type === 'Ranged Weapon' && this.item.parent) {
      const cat = this.item.system.category ?? '';
      context.availableAmmo = this.item.parent.items
        .filter(
          (i) =>
            i.type === 'Ammo' &&
            (!i.system.category || !cat || i.system.category === cat)
        )
        .map((i) => ({ id: i.id, name: i.name }));
    } else {
      context.availableAmmo = [];
    }

    if (
      this.item.type === 'Ranged Weapon' ||
      this.item.type === 'Melee Weapon'
    ) {
      /** @type {any} */
      const live = this.document.system;
      context.system.effectiveDamage = live.effectiveDamage;
      context.system.effectiveAP = live.effectiveAP;
      context.system.effectiveArmorType = live.effectiveArmorType;
      context.system.loadedAmmoName = live.loadedAmmoName;
      context.system.effectiveRC = live.effectiveRC;
      context.system.effectiveSmartlink = live.effectiveSmartlink;
      context.system.usedModSlots = live.usedModSlots;
      context.system.modSlotWarning = live.modSlotWarning;
      context.system.totalCost = live.totalCost;

      const { installedMods, availableMods } = this._resolveItemMods(
        'Weapon Mod',
        live.installedModIds
      );
      context.availableWeaponMods = availableMods;
      context.installedMods = installedMods;
    }

    if (this.item.type === 'Armor') {
      /** @type {any} */
      const live = this.document.system;
      context.system.effectiveBallistic = live.effectiveBallistic;
      context.system.effectiveImpact = live.effectiveImpact;
      context.system.maxCapacity = live.maxCapacity;
      context.system.usedCapacity = live.usedCapacity;
      context.system.capacityWarning = live.capacityWarning;
      context.system.totalCost = live.totalCost;

      const { installedMods, availableMods } = this._resolveItemMods(
        'Armor Mod',
        live.installedModIds
      );
      context.availableArmorMods = availableMods;
      context.installedMods = installedMods;
    }

    if (this.item.type === 'Power') {
      /** @type {any} */
      const live = this.document.system;
      context.system.totalCost = live.totalCost;
    }

    if (this.item.type === 'Weapon Mod') {
      context.mountpoints = WeaponMountPoints;
    }

    if (this.item.type === 'Metatype') {
      context.attributeRows = SR4ItemSheet.#buildAttributeRows(context.system);
    }

    if (this.item.type === 'CritterTemplate') {
      context.critterAttributeRows = SR4ItemSheet.#buildCritterAttributeRows(
        context.system
      );
    }

    this._prepareActionsEffectsContext(context);

    return context;
  }

  static #ATTRIBUTE_ROW_KEYS = [
    { key: 'body', label: 'sr4.stats.BODY' },
    { key: 'agility', label: 'sr4.stats.AGILITY' },
    { key: 'reaction', label: 'sr4.stats.REACTION' },
    { key: 'strength', label: 'sr4.stats.STRENGTH' },
    { key: 'charisma', label: 'sr4.stats.CHARISMA' },
    { key: 'intuition', label: 'sr4.stats.INTUITION' },
    { key: 'logic', label: 'sr4.stats.LOGIC' },
    { key: 'willpower', label: 'sr4.stats.WILLPOWER' },
    { key: 'edge', label: 'sr4.stats.EDGE' },
    { key: 'magic', label: 'sr4.stats.MAGIC' },
    { key: 'resonance', label: 'sr4.stats.RESONANCE' },
    { key: 'essence', label: 'sr4.stats.ESSENCE' },
  ];

  static #buildAttributeRows(system) {
    return SR4ItemSheet.#ATTRIBUTE_ROW_KEYS.map(({ key, label }) => ({
      key,
      label,
      min: system.attributes?.[key]?.min ?? 0,
      max: system.attributes?.[key]?.max ?? 0,
      aug: system.attributes?.[key]?.aug ?? 0,
    }));
  }

  static #buildCritterAttributeRows(system) {
    return SR4ItemSheet.#ATTRIBUTE_ROW_KEYS.map(({ key, label }) => {
      const attr = system.attributes?.[key] ?? {};
      return {
        key,
        label,
        value: attr.value ?? 0,
        formula: attr.formula ?? '',
        hasFormula: Boolean(attr.formula),
      };
    });
  }

  /**
   * Resolves installed/available mods of a given type for this item, using
   * the shared mod-resolution helper. Single place for both weapon-mod and
   * armor-mod (and any future mod type) lookups — previously these were two
   * hand-copied blocks differing only in the type string.
   *
   * @param {string} modType - e.g. 'Weapon Mod', 'Armor Mod'
   * @param {string[]} installedModIds
   */
  _resolveItemMods(modType, installedModIds) {
    if (!this.item.parent) {
      return { installedMods: [], availableMods: [] };
    }
    const pool = buildModPoolFromCollection(this.item.parent.items, modType);
    const allClaimed = new Set();
    for (const item of this.item.parent.items) {
      if (!item.system?.installedModIds) continue;
      for (const id of item.system.installedModIds) {
        allClaimed.add(id);
      }
    }
    return resolveModsAndAvailability(pool, installedModIds, allClaimed);
  }

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

  _prepareActionsEffectsContext(context) {
    context.linkedActions = (this.item.parent?.items ?? [])
      .filter(
        (i) => i.type === 'Action' && i.system.linkedItemId === this.item.id
      )
      .map((i) => ({ id: i.id, name: i.name }));
    context.effects = this.document.effects.contents.map((e) => ({
      id: e.id,
      name: e.name,
      img: e.img ?? 'icons/svg/aura.svg',
      active: !e.disabled,
      key: e.changes[0]?.key ?? '',
      mode: e.changes[0]?.type ?? 'add',
      value: Number(e.changes[0]?.value ?? 0),
    }));
    context.effectTargets = SR4EffectTargets;

    const templates = Object.entries(EFFECT_TEMPLATES).map(([key, tpl]) => ({
      key,
      name: game.i18n.localize(tpl.name),
      type: 'template',
    }));
    const existing = [];
    const actor = this.item.parent;
    if (actor) {
      const seen = new Set();
      for (const e of actor.effects.contents) {
        if (seen.has(e.name)) continue;
        seen.add(e.name);
        existing.push({ key: `actor:${e.id}`, name: e.name, type: 'existing' });
      }
      for (const item of actor.items) {
        for (const e of item.effects.contents) {
          if (seen.has(e.name)) continue;
          seen.add(e.name);
          existing.push({
            key: `item:${item.id}:${e.id}`,
            name: `${e.name} (${item.name})`,
            type: 'existing',
          });
        }
      }
    }
    context.effectTemplates = [...templates, ...existing];
    context.hasExistingEffects = existing.length > 0;
  }

  // -- Actions (linked items on parent actor) --------------------------------

  static async #onEditItem(event, target) {
    const id = target.closest('[data-item-id]')?.dataset.itemId;
    if (!id) return;
    this.item.parent?.items.get(id)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    const id = target.closest('[data-item-id]')?.dataset.itemId;
    if (!id) return;
    await this.item.parent?.deleteEmbeddedDocuments('Item', [id]);
    this.render();
  }

  static async #onCreateLinkedAction() {
    if (!this.item.parent) return;
    const created = await this.item.parent.createEmbeddedDocuments('Item', [
      {
        type: 'Action',
        name: game.i18n.localize('sr4.action.new'),
        system: { linkedItemId: this.item.id },
      },
    ]);
    if (created[0]) created[0].sheet.render(true);
    this.render();
  }

  // -- Effects (embedded on this item) ---------------------------------------

  static async #onCreateEffect() {
    await this.item.createEmbeddedDocuments('ActiveEffect', [
      {
        name: game.i18n.localize('sr4.effect.new'),
        changes: [{ key: 'system.sheetStats.BODY', type: 'add', value: 0 }],
        disabled: false,
        transfer: this.item.type !== 'Spell',
      },
    ]);
  }

  static async #onAddEffectTemplate(event, target) {
    const key = target.value;
    if (!key) return;
    target.value = '';

    let effectData;
    if (key.startsWith('actor:') || key.startsWith('item:')) {
      const parts = key.split(':');
      const source =
        parts[0] === 'actor'
          ? this.item.parent?.effects.get(parts[1])
          : this.item.parent?.items.get(parts[1])?.effects.get(parts[2]);
      if (!source) return;
      effectData = source.toObject();
      delete effectData._id;
    } else {
      const tpl = EFFECT_TEMPLATES[key];
      if (!tpl) return;
      effectData = {
        ...foundry.utils.deepClone(tpl),
        name: game.i18n.localize(tpl.name),
      };
    }

    await this.item.createEmbeddedDocuments('ActiveEffect', [
      { ...effectData, transfer: this.item.type !== 'Spell' },
    ]);
  }

  static async #onToggleEffect(event, target) {
    const id =
      target.dataset.effectId ??
      target.closest('[data-effect-id]')?.dataset.effectId;
    if (!id) return;
    const effect = this.item.effects.get(id);
    if (!effect) return;
    await effect.update({ disabled: !effect.disabled });
  }

  static async #onEditEffect(event, target) {
    const id = target.closest('[data-effect-id]')?.dataset.effectId;
    if (!id) return;
    const effect = this.item.effects.get(id);
    if (!effect) return;
    new SR4ActiveEffectSheet({ document: effect }).render(true);
  }

  static async #onDeleteEffect(event, target) {
    const id = target.closest('[data-effect-id]')?.dataset.effectId;
    if (!id) return;
    await this.item.deleteEmbeddedDocuments('ActiveEffect', [id]);
  }

  // -- Mods (installed on this host item) -------------------------------------

  static async #onAddMod(event, target) {
    const modId = target.value;
    if (!modId) return;
    target.value = '';
    const current = this.document.system.installedModIds ?? [];
    if (current.includes(modId)) return;
    await this.item.update({
      'system.installedModIds': [...current, modId],
    });
  }

  static async #onRemoveMod(event, target) {
    const modId =
      target.dataset.modId ?? target.closest('[data-mod-id]')?.dataset.modId;
    if (!modId) return;
    const current = this.document.system.installedModIds ?? [];
    await this.item.update({
      'system.installedModIds': current.filter((id) => id !== modId),
    });
  }

  static async #onCreateMod(event, target) {
    const modType = target.dataset.itemType;
    if (!modType || !this.item.parent) return;
    const [mod] = await this.item.parent.createEmbeddedDocuments('Item', [
      { name: game.i18n.localize(`TYPES.Item.${modType}`), type: modType },
    ]);
    if (!mod) return;
    const current = this.document.system.installedModIds ?? [];
    await this.item.update({
      'system.installedModIds': [...current, mod.id],
    });
    mod.sheet?.render(true);
  }
}
