// @ts-nocheck
import {
  NpcSkillsMenu,
  DEFAULT_NPC_SKILLS_JSON,
} from '../sheets/settings/npc-skills-menu.js';
import { XmlImporterApp } from '../sheets/importer/importer-app.js';

export class SettingsHook {
  constructor() {
    Hooks.once('init', () => {
      game.settings.register('shadowrun4e', 'combatDefenseWorkflow', {
        name: 'sr4.settings.combatDefenseWorkflow.name',
        hint: 'sr4.settings.combatDefenseWorkflow.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
          if (!value)
            game.settings.set('shadowrun4e', 'combatSoakWorkflow', false);
        },
      });

      game.settings.register('shadowrun4e', 'combatSoakWorkflow', {
        name: 'sr4.settings.combatSoakWorkflow.name',
        hint: 'sr4.settings.combatSoakWorkflow.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'gmDefenderPicker', {
        name: 'sr4.settings.gmDefenderPicker.name',
        hint: 'sr4.settings.gmDefenderPicker.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
      });

      game.settings.register('shadowrun4e', 'applyDamageWorkflow', {
        name: 'sr4.settings.applyDamageWorkflow.name',
        hint: 'sr4.settings.applyDamageWorkflow.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'flowEdgeTimeout', {
        name: 'sr4.settings.flowEdgeTimeout.name',
        hint: 'sr4.settings.flowEdgeTimeout.hint',
        scope: 'world',
        config: true,
        type: Number,
        default: 20,
        range: { min: 5, max: 120, step: 5 },
      });

      game.settings.register('shadowrun4e', 'flowOpposedRollTimeout', {
        name: 'sr4.settings.flowOpposedRollTimeout.name',
        hint: 'sr4.settings.flowOpposedRollTimeout.hint',
        scope: 'world',
        config: true,
        type: Number,
        default: 30,
        range: { min: 10, max: 120, step: 10 },
      });

      game.settings.register('shadowrun4e', 'ammoTracking', {
        name: 'sr4.settings.ammoTracking.name',
        hint: 'sr4.settings.ammoTracking.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'liveInitiativeReduction', {
        name: 'sr4.settings.liveInitiativeReduction.name',
        hint: 'sr4.settings.liveInitiativeReduction.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'spellWorkflow', {
        name: 'sr4.settings.spellWorkflow.name',
        hint: 'sr4.settings.spellWorkflow.hint',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'autoSustainEffect', {
        name: 'sr4.settings.autoSustainEffect.name',
        hint: 'sr4.settings.autoSustainEffect.hint',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'useDefaultEffectSheet', {
        name: 'sr4.settings.useDefaultEffectSheet.name',
        hint: 'sr4.settings.useDefaultEffectSheet.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        onChange: () => foundry.utils.debouncedReload(),
      });

      game.settings.registerMenu('shadowrun4e', 'npcSkillsMenu', {
        name: 'sr4.settings.npcSkillsMenu.name',
        label: 'sr4.settings.npcSkillsMenu.label',
        hint: 'sr4.settings.npcSkillsMenu.hint',
        icon: 'fas fa-list-check',
        type: NpcSkillsMenu,
        restricted: true,
      });

      game.settings.registerMenu('shadowrun4e', 'xmlImporter', {
        name: 'sr4.settings.xmlImporter.name',
        label: 'sr4.settings.xmlImporter.label',
        hint: 'sr4.settings.xmlImporter.hint',
        icon: 'fas fa-file-import',
        type: XmlImporterApp,
        restricted: true,
      });

      game.settings.register('shadowrun4e', 'defaultTokenVision', {
        name: 'sr4.settings.defaultTokenVision.name',
        hint: 'sr4.settings.defaultTokenVision.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register('shadowrun4e', 'defaultTokenVisionRange', {
        name: 'sr4.settings.defaultTokenVisionRange.name',
        hint: 'sr4.settings.defaultTokenVisionRange.hint',
        scope: 'world',
        config: true,
        type: Number,
        default: 60,
        range: { min: 0, max: 200, step: 5 },
      });

      game.settings.register('shadowrun4e', 'spiritCompendium', {
        name: 'sr4.settings.spiritCompendium.name',
        hint: 'sr4.settings.spiritCompendium.hint',
        scope: 'world',
        config: true,
        type: String,
        default: 'world.sr4-critter-spirits',
      });

      game.settings.register('shadowrun4e', 'spriteCompendium', {
        name: 'sr4.settings.spriteCompendium.name',
        hint: 'sr4.settings.spriteCompendium.hint',
        scope: 'world',
        config: true,
        type: String,
        default: 'world.sr4-critter-sprites',
      });

      game.settings.register('shadowrun4e', 'importerEnabledSources', {
        scope: 'world',
        config: false,
        type: Array,
        default: [],
      });

      game.settings.register('shadowrun4e', 'npcDefaultSkills', {
        scope: 'world',
        config: false,
        type: String,
        default: DEFAULT_NPC_SKILLS_JSON,
      });
    });
  }
}
