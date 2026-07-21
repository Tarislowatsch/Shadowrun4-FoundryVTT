import { SR4 } from './config.js';
import { SR4Actor } from './documents/actor.js';
import { SR4Combat } from './documents/combat.js';
import { createSR4CombatTracker } from './documents/combat-tracker.js';
import {
  SR4ActiveEffect,
  EFFECT_TEMPLATES,
  getWorldEffectTemplates,
  getAllEffectTemplates,
  resolveEffectTemplate,
} from '@effects/index.js';
import {
  SR4CharacterSheet,
  registerCharacterPartials,
  registerActorPartials,
  registerItemPartials,
  registerHelpers,
  SR4SkillsSheet,
  SR4ItemSheet,
  SR4NpcSheet,
  SR4SpiritSheet,
  SR4SpriteSheet,
  SR4DeviceSheet,
  SR4VehicleSheet,
  SR4ActiveEffectSheet,
  registerUIPartials,
  registerSharedPartials,
} from '@sheets/index.js';
import { registerHooks } from '@hooks/index.js';
import {
  handleAttackRoll,
  handleSkillRoll,
  handleFreeRoll,
  openActionDialog,
  openMatrixActionDialog,
  reloadWeapon,
  getGame,
  ControlModes,
  DroneActions,
  getRiggerLookup,
  mergeRiggerLookup,
  openDroneAttackDialog,
  openDroneRollDialog,
  resolveDronePool,
  resolveRigger,
  openSourceReference,
} from '@utils/index.js';
import { SpellcastingFlow } from '@flows/spellcasting-flow.js';
import { SummoningFlow } from '@flows/summoning-flow.js';
import { ThreadingFlow } from '@flows/threading-flow.js';
import { BindingFlow } from '@flows/binding-flow.js';
import { DismissalFlow } from '@flows/dismissal-flow.js';
import { ActionCategory } from '@models/actions/actions.model';
import {
  REALMS,
  getAvailableRealms,
  getCombatantRealm,
} from './documents/initiative.js';

/**
 * @typedef {object} SR4Global
 * @property {import('./config').SR4Config} config
 * @property {{
 *   handleAttackRoll: Function,
 *   handleSkillRoll: Function,
 *   handleFreeRoll: Function,
 *   openActionDialog: Function,
 *   openMatrixActionDialog: Function,
 * }} dialogUtility
 * @property {typeof SpellcastingFlow} SpellcastingFlow
 * @property {typeof SummoningFlow} SummoningFlow
 * @property {typeof ThreadingFlow} ThreadingFlow
 * @property {typeof BindingFlow} BindingFlow
 * @property {typeof DismissalFlow} DismissalFlow
 * @property {typeof ActionCategory} ActionCategory
 * @property {typeof reloadWeapon} reloadWeapon
 * @property {{
 *   ControlModes: typeof ControlModes,
 *   DroneActions: typeof DroneActions,
 *   getRiggerLookup: Function,
 *   mergeRiggerLookup: Function,
 *   openDroneAttackDialog: Function,
 *   openDroneRollDialog: Function,
 *   resolveDronePool: Function,
 *   resolveRigger: Function,
 * }} rigging
 * @property {{
 *   REALMS: readonly string[],
 *   getAvailableRealms: Function,
 *   getCombatantRealm: Function,
 * }} initiative
 * @property {{
 *   EFFECT_TEMPLATES: object,
 *   getWorldEffectTemplates: Function,
 *   getAllEffectTemplates: Function,
 *   resolveEffectTemplate: Function,
 * }} effects
 */
globalThis.sr4 = {
  config: SR4,
  dialogUtility: {
    handleAttackRoll,
    handleSkillRoll,
    handleFreeRoll,
    openActionDialog,
    openMatrixActionDialog,
  },
  SpellcastingFlow,
  SummoningFlow,
  ThreadingFlow,
  BindingFlow,
  DismissalFlow,
  ActionCategory,
  reloadWeapon,
  rigging: {
    ControlModes,
    DroneActions,
    getRiggerLookup,
    mergeRiggerLookup,
    openDroneAttackDialog,
    openDroneRollDialog,
    resolveDronePool,
    resolveRigger,
  },
  initiative: {
    REALMS,
    getAvailableRealms,
    getCombatantRealm,
  },
  effects: {
    EFFECT_TEMPLATES,
    getWorldEffectTemplates,
    getAllEffectTemplates,
    resolveEffectTemplate,
  },
};

registerHooks();

Hooks.once('init', async function () {
  registerHelpers();

  await registerCharacterPartials();
  await registerActorPartials();
  await registerItemPartials();
  await registerUIPartials();
  await registerSharedPartials();

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-sr4-source]');
    if (!link) return;
    event.preventDefault();
    openSourceReference(link.dataset.sr4Source);
  });

  globalThis.sr4 = game.sr4 = Object.assign(game.system, globalThis.sr4);

  CONFIG.SR4 = SR4;
  CONFIG.Actor.documentClass = SR4Actor;
  CONFIG.Combat.documentClass = SR4Combat;
  CONFIG.ui.combat = createSR4CombatTracker();
  CONFIG.ActiveEffect.documentClass = SR4ActiveEffect;
  CONFIG.statusEffects.push(
    {
      id: 'sr4-sustain',
      label: 'sr4.effect.templates.sustain',
      img: 'icons/svg/aura.svg',
    },
    {
      id: 'sr4-disoriented',
      label: 'sr4.effect.templates.disoriented',
      img: 'icons/svg/stoned.svg',
    },
    {
      id: 'sr4-blind',
      label: 'sr4.effect.templates.blind',
      img: 'icons/svg/blind.svg',
    },
    {
      id: 'sr4-blind-flare-comp',
      label: 'sr4.effect.templates.blindFlareComp',
      img: 'icons/svg/blind.svg',
    },
    {
      id: 'sr4-knocked-down',
      label: 'sr4.effect.templates.knockedDown',
      img: 'icons/svg/falling.svg',
    },
    {
      id: 'sr4-dumpshocked',
      label: 'sr4.effect.templates.dumpshocked',
      img: 'icons/svg/stoned.svg',
    }
  );
  CONFIG.Actor.prototypeToken = {
    actorLink: true,
  };

  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;

  DocumentSheetConfig.unregisterSheet(
    Actor,
    'core',
    foundry.appv1.sheets.ActorSheet
  );
  DocumentSheetConfig.registerSheet(Actor, 'sr4', SR4CharacterSheet, {
    types: ['character'],
    makeDefault: true,
  });

  DocumentSheetConfig.registerSheet(Actor, 'sr4', SR4NpcSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'SR4 NPC Sheet',
  });

  DocumentSheetConfig.registerSheet(Actor, 'sr4', SR4SpiritSheet, {
    types: ['spirit'],
    makeDefault: true,
    label: 'SR4 Spirit Sheet',
  });

  DocumentSheetConfig.registerSheet(Actor, 'sr4', SR4SpriteSheet, {
    types: ['sprite'],
    makeDefault: true,
    label: 'SR4 Sprite Sheet',
  });

  DocumentSheetConfig.registerSheet(Actor, 'sr4', SR4DeviceSheet, {
    types: ['device'],
    makeDefault: true,
    label: 'SR4 Device Sheet',
  });

  DocumentSheetConfig.registerSheet(Actor, 'sr4', SR4VehicleSheet, {
    types: ['vehicle'],
    makeDefault: true,
    label: 'SR4 Vehicle Sheet',
  });

  DocumentSheetConfig.registerSheet(
    foundry.documents.BaseActiveEffect,
    'sr4',
    SR4ActiveEffectSheet,
    {
      makeDefault: !game.settings.get('shadowrun4e', 'useDefaultEffectSheet'),
      label: 'SR4 Active Effect',
    }
  );

  DocumentSheetConfig.unregisterSheet(
    Item,
    'core',
    foundry.appv1.sheets.ItemSheet
  );
  const SR4_ITEM_SHEET_TYPES = [
    'Ammo',
    'Commlink',
    'Ranged Weapon',
    'Melee Weapon',
    'Implant',
    'Item',
    'Gear',
    'Armor',
    'Spell',
    'Program',
    'Quality',
    'Action',
    'Power',
    'CritterPower',
    'Autosoft',
    'Weapon Mod',
    'Armor Mod',
    'Vehicle Mod',
    'Metatype',
    'CritterTemplate',
    'Focus',
    'Fetish',
  ];

  DocumentSheetConfig.registerSheet(Item, 'sr4', SR4ItemSheet, {
    types: SR4_ITEM_SHEET_TYPES,
    makeDefault: true,
  });
  DocumentSheetConfig.registerSheet(Item, 'sr4', SR4SkillsSheet, {
    types: ['Skill'],
  });
});

Hooks.once('i18nInit', () => {
  if (!getGame().i18n) {
    ui?.notifications?.error('No translations available');
    console.warn('game.i18n is undefined');
  }
});
