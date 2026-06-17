import { ActionType, Shootingmodes, SR4Attributes } from '@models/index';
import { buildWeaponContext } from './weapon-context.js';
import { buildComputedStats, sortSkillsByLabel } from './actor-context.js';
import SR4BaseActorSheet from './sr4-base-actor-sheet.js';

export default class SR4NpcSheet extends SR4BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'npc', 'sheet-container'],
    position: { width: 1400, height: 800 },
    window: {
      resizable: true,
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
      weapons: buildWeaponContext(items),
      skills: sortSkillsByLabel(items),
      armor: items.filter((i) => i.type === 'Armor'),
      critterPowers: this._enrichItemContext(items, 'CritterPower'),
      isTechnomancer: actorData.system.technomancer,
      ...buildComputedStats(actorData, derived),
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
}
