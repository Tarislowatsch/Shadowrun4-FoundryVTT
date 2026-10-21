// @ts-nocheck
import { NpcSkillsMenu } from '../sheets/settings/npc-skills-menu.js';
import { DEFAULT_NPC_SKILLS_JSON } from '../sheets/settings/npc-default-skills.js';
import { XmlImporterApp } from '../sheets/importer/importer-app.js';
import { RiggerLookupMenu } from '../sheets/settings/rigger-lookup-menu.js';
import { SourceBooksMenu } from '../sheets/settings/source-books-menu.js';
import { FlowSettingsMenu } from '../sheets/settings/flow-settings-menu.js';
import { invalidateItemNameTranslationsCache } from '../utils/item-name-translations.js';
import { SR4 } from '@config';

export class SettingsHook {
  constructor() {
    Hooks.once('init', () => {
      game.settings.registerMenu(SR4.namespace, 'flowSettingsMenu', {
        name: 'sr4.settings.flowSettingsMenu.name',
        label: 'sr4.settings.flowSettingsMenu.label',
        hint: 'sr4.settings.flowSettingsMenu.hint',
        icon: 'fas fa-diagram-project',
        type: FlowSettingsMenu,
        restricted: false,
      });

      game.settings.register(SR4.namespace, 'combatDefenseWorkflow', {
        name: 'sr4.settings.combatDefenseWorkflow.name',
        hint: 'sr4.settings.combatDefenseWorkflow.hint',
        scope: 'world',
        config: false,
        type: Boolean,
        default: true,
        onChange: (value) => {
          if (!value)
            game.settings.set(SR4.namespace, 'combatSoakWorkflow', false);
        },
      });

      game.settings.register(SR4.namespace, 'combatSoakWorkflow', {
        name: 'sr4.settings.combatSoakWorkflow.name',
        hint: 'sr4.settings.combatSoakWorkflow.hint',
        scope: 'world',
        config: false,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'cybercombatWorkflow', {
        name: 'sr4.settings.cybercombatWorkflow.name',
        hint: 'sr4.settings.cybercombatWorkflow.hint',
        scope: 'world',
        config: false,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'gmDefenderPicker', {
        name: 'sr4.settings.gmDefenderPicker.name',
        hint: 'sr4.settings.gmDefenderPicker.hint',
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
      });

      game.settings.register(SR4.namespace, 'applyDamageWorkflow', {
        name: 'sr4.settings.applyDamageWorkflow.name',
        hint: 'sr4.settings.applyDamageWorkflow.hint',
        scope: 'world',
        config: false,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'flowEdgeTimeout', {
        name: 'sr4.settings.flowEdgeTimeout.name',
        hint: 'sr4.settings.flowEdgeTimeout.hint',
        scope: 'world',
        config: false,
        type: Number,
        default: 20,
        range: { min: 5, max: 120, step: 5 },
      });

      game.settings.register(SR4.namespace, 'flowOpposedRollTimeout', {
        name: 'sr4.settings.flowOpposedRollTimeout.name',
        hint: 'sr4.settings.flowOpposedRollTimeout.hint',
        scope: 'world',
        config: false,
        type: Number,
        default: 30,
        range: { min: 10, max: 120, step: 10 },
      });

      game.settings.register(SR4.namespace, 'decisionMode', {
        name: 'sr4.settings.decisionMode.name',
        hint: 'sr4.settings.decisionMode.hint',
        scope: 'world',
        config: false,
        type: String,
        choices: {
          dialog: 'sr4.settings.decisionMode.choices.dialog',
          chat: 'sr4.settings.decisionMode.choices.chat',
          custom: 'sr4.settings.decisionMode.choices.custom',
        },
        default: 'dialog',
      });

      for (const category of ['Combat', 'Magic', 'Matrix']) {
        game.settings.register(SR4.namespace, `decisionMode${category}`, {
          name: `sr4.settings.decisionMode${category}.name`,
          hint: `sr4.settings.decisionMode${category}.hint`,
          scope: 'world',
          config: false,
          type: String,
          choices: {
            dialog: 'sr4.settings.decisionMode.choices.dialog',
            chat: 'sr4.settings.decisionMode.choices.chat',
          },
          default: 'dialog',
        });
      }

      game.settings.register(SR4.namespace, 'ammoTracking', {
        name: 'sr4.settings.ammoTracking.name',
        hint: 'sr4.settings.ammoTracking.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'liveInitiativeReduction', {
        name: 'sr4.settings.liveInitiativeReduction.name',
        hint: 'sr4.settings.liveInitiativeReduction.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'spellWorkflow', {
        name: 'sr4.settings.spellWorkflow.name',
        hint: 'sr4.settings.spellWorkflow.hint',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'conjuringDrain', {
        name: 'sr4.settings.conjuringDrain.name',
        hint: 'sr4.settings.conjuringDrain.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
      });

      game.settings.register(SR4.namespace, 'autoSustainEffect', {
        name: 'sr4.settings.autoSustainEffect.name',
        hint: 'sr4.settings.autoSustainEffect.hint',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true,
      });

      game.settings.register(SR4.namespace, 'useDefaultEffectSheet', {
        name: 'sr4.settings.useDefaultEffectSheet.name',
        hint: 'sr4.settings.useDefaultEffectSheet.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        onChange: () => foundry.utils.debouncedReload(),
      });

      game.settings.registerMenu(SR4.namespace, 'npcSkillsMenu', {
        name: 'sr4.settings.npcSkillsMenu.name',
        label: 'sr4.settings.npcSkillsMenu.label',
        hint: 'sr4.settings.npcSkillsMenu.hint',
        icon: 'fas fa-list-check',
        type: NpcSkillsMenu,
        restricted: true,
      });

      game.settings.registerMenu(SR4.namespace, 'xmlImporter', {
        name: 'sr4.settings.xmlImporter.name',
        label: 'sr4.settings.xmlImporter.label',
        hint: 'sr4.settings.xmlImporter.hint',
        icon: 'fas fa-file-import',
        type: XmlImporterApp,
        restricted: true,
      });

      game.settings.register(SR4.namespace, 'changeEncumbranceToStrength', {
        name: 'sr4.settings.changeEncumbranceToStrength.name',
        hint: 'sr4.settings.changeEncumbranceToStrength.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
      });

      game.settings.register(
        SR4.namespace,
        'ignoreEncumbranceSingleArmorItem',
        {
          name: 'sr4.settings.ignoreEncumbranceSingleArmorItem.name',
          hint: 'sr4.settings.ignoreEncumbranceSingleArmorItem.hint',
          scope: 'world',
          config: true,
          type: Boolean,
          default: false,
        }
      );

      game.settings.register(SR4.namespace, 'flagMigrationVersion', {
        scope: 'world',
        config: false,
        type: Number,
        default: 0,
      });

      game.settings.register(SR4.namespace, 'spiritCompendium', {
        name: 'sr4.settings.spiritCompendium.name',
        hint: 'sr4.settings.spiritCompendium.hint',
        scope: 'world',
        config: true,
        type: String,
        default: 'world.sr4-critter-spirits',
      });

      game.settings.register(SR4.namespace, 'spriteCompendium', {
        name: 'sr4.settings.spriteCompendium.name',
        hint: 'sr4.settings.spriteCompendium.hint',
        scope: 'world',
        config: true,
        type: String,
        default: 'world.sr4-critter-sprites',
      });

      game.settings.register(SR4.namespace, 'importerEnabledSources', {
        scope: 'world',
        config: false,
        type: Array,
        default: [],
      });

      game.settings.register(SR4.namespace, 'npcDefaultSkills', {
        scope: 'world',
        config: false,
        type: String,
        default: DEFAULT_NPC_SKILLS_JSON,
      });

      game.settings.registerMenu(SR4.namespace, 'riggerLookupMenu', {
        name: 'sr4.settings.riggerLookupMenu.name',
        label: 'sr4.settings.riggerLookupMenu.label',
        hint: 'sr4.settings.riggerLookupMenu.hint',
        icon: 'fas fa-satellite-dish',
        type: RiggerLookupMenu,
        restricted: true,
      });

      game.settings.register(SR4.namespace, 'riggerLookup', {
        scope: 'world',
        config: false,
        type: String,
        default: '{}',
      });

      game.settings.registerMenu(SR4.namespace, 'sourceBooksMenu', {
        name: 'sr4.settings.sourceBooksMenu.name',
        label: 'sr4.settings.sourceBooksMenu.label',
        hint: 'sr4.settings.sourceBooksMenu.hint',
        icon: 'fas fa-book-open',
        type: SourceBooksMenu,
        restricted: true,
      });

      game.settings.register(SR4.namespace, 'sourceBookBindings', {
        scope: 'world',
        config: false,
        type: String,
        default: '{}',
      });

      game.settings.register(SR4.namespace, 'itemNameTranslations', {
        scope: 'world',
        config: false,
        type: String,
        default: '{}',
      });
    });

    Hooks.on('updateSetting', (setting) => {
      if (setting.key === 'shadowrun4e.itemNameTranslations') {
        invalidateItemNameTranslationsCache();
      }
    });
  }
}
