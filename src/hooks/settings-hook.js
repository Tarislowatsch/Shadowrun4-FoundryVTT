// @ts-nocheck
import {
  NpcSkillsMenu,
  DEFAULT_NPC_SKILLS_JSON,
} from '../sheets/settings/npc-skills-menu.js';
import { XmlImporterApp } from '../sheets/importer/importer-app.js';

export class SettingsHook {
  constructor() {
    Hooks.once('init', () => {
      // --- Combat ---

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

      game.settings.register('shadowrun4e', 'edgeCardTimeout', {
        name: 'sr4.settings.edgeCardTimeout.name',
        hint: 'sr4.settings.edgeCardTimeout.hint',
        scope: 'world',
        config: true,
        type: Number,
        default: 120,
        range: { min: 10, max: 600, step: 10 },
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

      // --- Magic ---

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

      // --- System / UI ---

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

      // --- Hidden (no config UI) ---

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
