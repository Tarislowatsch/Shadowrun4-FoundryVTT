// @ts-nocheck
import {
  NpcSkillsMenu,
  DEFAULT_NPC_SKILLS_JSON,
} from '../sheets/settings/npc-skills-menu.js';

export class SettingsHook {
  constructor() {
    Hooks.once('init', () => {
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

      game.settings.register('shadowrun4e', 'liveInitiativeReduction', {
        name: 'sr4.settings.liveInitiativeReduction.name',
        hint: 'sr4.settings.liveInitiativeReduction.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
      });

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

      game.settings.register('shadowrun4e', 'npcDefaultSkills', {
        scope: 'world',
        config: false,
        type: String,
        default: DEFAULT_NPC_SKILLS_JSON,
      });
    });
  }
}
