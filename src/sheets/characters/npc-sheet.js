import { getGame, handleSkillRoll } from '@utils/index';
import {
  ActionType,
  Attackskill,
  Shootingmodes,
  SR4Attributes,
} from '@models/index';

export default class SR4NpcSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  /** @type {boolean} */
  editMode = false;

  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'npc'],
    position: { width: 1400, height: 800 },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      deleteItem: SR4NpcSheet.#onDeleteItem,
      editItem: SR4NpcSheet.#onEditItem,
      toggleEquip: SR4NpcSheet.#onToggleEquip,
      monitorBox: SR4NpcSheet.#onMonitorBox,
      attackRoll: SR4NpcSheet.#onAttackRoll,
    },
  };

  static PARTS = {
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
    },
    main: {
      template: 'systems/shadowrun4e/templates/sheets/characters/npc.sheet.hbs',
      scrollable: [''],
    },
    defense: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/defense.tab.hbs',
      scrollable: [''],
    },
    modifiers: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/modifiers.tab.hbs',
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'main', icon: 'fas fa-user', label: 'sr4.tab.main' },
        { id: 'defense', icon: 'fas fa-shield-alt', label: 'sr4.tab.defense' },
        {
          id: 'modifiers',
          icon: 'fas fa-sliders-h',
          label: 'sr4.tab.modifiers',
        },
      ],
      initial: 'main',
    },
  };

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    const actorData = this.document.toObject(false);
    const items = actorData.items || [];
    const derived = this.document.system.derivedStats;
    return {
      tabs: this._prepareTabs('primary'),
      editMode: this.editMode,
      actor: {
        img: actorData.img,
        name: actorData.name,
        uuid: actorData._id,
      },
      system: actorData.system,
      flags: actorData.flags,
      // @ts-ignore — CONFIG.SR4 is registered at runtime by the system
      config: CONFIG.SR4,
      attributes: SR4Attributes,
      shootingmodes: Shootingmodes,
      actiontypes: ActionType,
      attackskills: Attackskill,
      weapons: items.filter(
        (i) => i.type === 'Ranged Weapon' || i.type === 'Melee Weapon'
      ),
      skills: items
        .filter((i) => i.type === 'Skill')
        .sort((a, b) => {
          const labelA = a.system.label
            ? getGame().i18n?.localize(a.system.label)
            : a.name;
          const labelB = b.system.label
            ? getGame().i18n?.localize(b.system.label)
            : b.name;
          return labelA.localeCompare(labelB);
        }),
      armor: items.filter((i) => i.type === 'Armor'),
      critterPowers: items.filter((i) => i.type === 'CritterPower'),
      computedStats: {
        ...actorData.system.sheetStats,
        INITIATIVE: derived?.initiative?.physical ?? 0,
        MATRIXINITIATIVE: derived?.initiative?.matrix ?? 0,
        ASTRALINITIATIVE: derived?.initiative?.astral ?? 0,
      },
      derivedKeys: ['INITIATIVE', 'MATRIXINITIATIVE', 'ASTRALINITIATIVE'],
    };
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'main':
      case 'defense':
      case 'modifiers':
        context.tab = context.tabs[partId];
        break;
    }
    if (partId === 'defense') {
      context.showSimpleHpToggle = true;
    }
    return context;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    const headerControls = frame.querySelector(
      '.window-header .header-control'
    );

    const toggle = document.createElement('label');
    toggle.className = 'switch edit-mode-switch';
    toggle.dataset.tooltip = 'Edit Mode';
    toggle.innerHTML = `
      <input type="checkbox" ${this.editMode ? 'checked' : ''}>
      <span class="slider"></span>
    `;

    toggle.querySelector('input')?.addEventListener('change', (ev) => {
      // @ts-ignore — checked exists on HTMLInputElement at runtime
      this.editMode = ev.currentTarget.checked;
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

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) => {
        input.addEventListener('focus', () => input.select());
      });
    this.element
      .querySelector('[data-edit="img"]')
      ?.addEventListener('click', () => {
        new foundry.applications.apps.FilePicker.implementation({
          type: 'image',
          current: this.actor.img,
          callback: (path) => this.actor.update({ img: path }),
        }).browse();
      });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static async #onDeleteItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  static async #onEditItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    this.actor.items.get(itemId)?.sheet?.render(true);
  }

  static async #onToggleEquip(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ 'system.equipped': !item.system.equipped });
  }

  static async #onMonitorBox(event, target) {
    const index = Number(target.dataset.index);
    const type =
      target.dataset.type ?? target.closest('.monitor-track')?.dataset.type;
    if (!type) return;
    const path = `system.conditionMonitor.${type}.current`;
    const current = foundry.utils.getProperty(this.actor, path);
    const newValue = index + 1 === current ? index : index + 1;
    await this.actor.update({ [path]: newValue });
  }

  static async #onAttackRoll(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const skillKey = target.dataset.attackSkill;
    if (!itemId || !skillKey) return;
    const weapon = this.actor.items.get(itemId);
    const skillName = this.actor.findByAttackSkill(skillKey)?.name;
    if (!skillName || !weapon) return;
    await handleSkillRoll(this.actor, skillName, weapon);
  }
}
