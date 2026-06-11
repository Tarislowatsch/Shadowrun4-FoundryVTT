import { SR4 } from './config.js';
import { SR4Actor } from './documents/actor.js';
import { SR4ActiveEffect } from '@effects/index.js';
import {
  SR4CharacterSheet,
  registerCharacterPartials,
  registerActorPartials,
  registerHelpers,
  SR4SkillsSheet,
  SR4ItemSheet,
  SR4NpcSheet,
  SR4SpiritSheet,
  SR4VehicleSheet,
  SR4ActiveEffectSheet,
  registerUIPartials,
} from '@sheets/index.js';
import { registerHooks } from '@hooks/index.js';
import {
  handleSkillRoll,
  handleFreeRoll,
  openActionDialog,
  getGame,
} from '@utils/index.js';
import { SpellcastingFlow } from '@flows/spellcasting-flow.js';

/**
 * @typedef {object} SR4Global
 * @property {import('./config').SR4Config} config
 * @property {{
 *   handleSkillRoll: Function,
 *   handleFreeRoll: Function,
 *   openActionDialog: Function,
 * }} dialogUtility
 * @property {typeof SpellcastingFlow} SpellcastingFlow
 */
globalThis.sr4 = {
  config: SR4,
  dialogUtility: { handleSkillRoll, handleFreeRoll, openActionDialog },
  SpellcastingFlow,
};

registerHooks();

Hooks.once('init', async function () {
  await registerCharacterPartials();
  await registerActorPartials();
  await registerUIPartials();

  globalThis.sr4 = game.sr4 = Object.assign(game.system, globalThis.sr4);

  CONFIG.SR4 = SR4;
  CONFIG.Actor.documentClass = SR4Actor;
  CONFIG.ActiveEffect.documentClass = SR4ActiveEffect;
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
      makeDefault: true,
      label: 'SR4 Active Effect',
    }
  );

  DocumentSheetConfig.unregisterSheet(
    Item,
    'core',
    foundry.appv1.sheets.ItemSheet
  );
  DocumentSheetConfig.registerSheet(Item, 'sr4', SR4ItemSheet, {
    types: [
      'Ranged Weapon',
      'Melee Weapon',
      'Implant',
      'Item',
      'Gear',
      'Armor',
      'Spell',
      'Program',
      'Action',
      'Power',
      'CritterPower',
      'Autosoft',
    ],
    makeDefault: true,
  });
  DocumentSheetConfig.registerSheet(Item, 'sr4', SR4SkillsSheet, {
    types: ['Skill'],
  });

  registerHelpers();
});

Hooks.once('i18nInit', () => {
  if (!getGame().i18n) {
    ui?.notifications?.error('No translations available');
    console.warn('game.i18n is undefined');
  }
});
