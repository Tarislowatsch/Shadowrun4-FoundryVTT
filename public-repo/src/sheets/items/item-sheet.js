import {
  ImplantGrades,
  ImplantTypes,
  Attackskill,
  DamageTypes,
  Shootingmodes,
  SpellTypes,
  SpellCategories,
  SpellRanges,
  SpellDurations,
  SpellElements,
  ActionType,
} from '@models/index';

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
  };

  static PARTS = {
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
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    const type = this.item.type.replace(/\s+/g, '').toLowerCase();
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
    context.attackskills = Attackskill;
    context.shootingmodes = Shootingmodes;
    context.actiontypes = ActionType;
    context.spelltypes = SpellTypes;
    context.spellcategories = SpellCategories;
    context.spellranges = SpellRanges;
    context.spellelements = SpellElements;
    context.spelldurations = SpellDurations;
    return context;
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
}
