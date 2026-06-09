import { SR4 } from './config.js';
import { SR4Actor } from './documents/actor.js';
import { SR4ActiveEffect } from '@effects/index.js';
import {
  SR4CharacterSheet,
  registerCharacterPartials,
  registerHelpers,
  SR4SkillsSheet,
  SR4ItemSheet,
  SR4NpcSheet,
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

Hooks.once('ready', async () => {
  if (!game.user?.isGM) return;
  await _migrateRemoveEffectItems();
});

async function _migrateRemoveEffectItems() {
  // Remove legacy "Effect" items left over from the old custom item type
  const worldEffects = game.items?.filter((i) => i.type === 'Effect') ?? [];
  if (worldEffects.length) {
    await Item.deleteDocuments(worldEffects.map((i) => i.id));
    console.log(
      `SR4 | Migrated: deleted ${worldEffects.length} world-level Effect item(s)`
    );
  }
  for (const actor of game.actors ?? []) {
    const actorEffects = actor.items.filter((i) => i.type === 'Effect');
    if (actorEffects.length) {
      await actor.deleteEmbeddedDocuments(
        'Item',
        actorEffects.map((i) => i.id)
      );
      console.log(
        `SR4 | Migrated: deleted ${actorEffects.length} Effect item(s) from ${actor.name}`
      );
    }
  }
}

/**
 * Preloads all Handlebars templates used by the system.
 * @returns {Promise<void>}
 */
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    'systems/shadowrun4e/templates/sheets/characters/player.sheet.hbs',
    'systems/shadowrun4e/templates/sheets/characters/npc.sheet.hbs',
  ];
  return foundry.applications.handlebars.loadTemplates(templatePaths);
}
