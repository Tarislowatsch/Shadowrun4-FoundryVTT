// @ts-nocheck
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
    });
  }
}
