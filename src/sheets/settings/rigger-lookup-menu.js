// @ts-nocheck
import {
  DEFAULT_RIGGER_LOOKUP,
  mergeRiggerLookup,
} from '@utils/rigging/drone-pool.js';

const SKILL_ROLES = [
  'attackSkill',
  'fullDefenseSkill',
  'perceptionSkill',
  'infiltrationSkill',
];

export class RiggerLookupMenu extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: 'sr4-rigger-lookup-menu',
    window: {
      title: 'sr4.settings.riggerLookupMenu.title',
      resizable: true,
    },
    position: { width: 480, height: 'auto' },
    actions: {
      save: RiggerLookupMenu.#onSave,
      reset: RiggerLookupMenu.#onReset,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/settings/rigger-lookup-menu.hbs',
    },
  };

  async _prepareContext() {
    const saved = mergeRiggerLookup(
      DEFAULT_RIGGER_LOOKUP,
      game.settings.get('shadowrun4e', 'riggerLookup')
    );

    const compendium = game.packs.get('shadowrun4e.skills');
    let skillOptions = [];
    if (compendium) {
      const index = await compendium.getIndex({
        fields: ['system.label', 'system.category'],
      });
      skillOptions = index
        .filter((entry) => entry.type === 'Skill')
        .map((entry) => ({
          value: entry.system?.label || entry.name,
          name: entry.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      roles: SKILL_ROLES.map((key) => ({
        key,
        label: `sr4.settings.riggerLookupMenu.roles.${key}`,
        options: skillOptions.map((option) => ({
          ...option,
          selected: option.value === saved[key],
        })),
      })),
      commandProgram: saved.commandProgram,
    };
  }

  static async #onSave(_event, _target) {
    const result = {};
    for (const key of SKILL_ROLES) {
      const value =
        this.element.querySelector(`select[name="${key}"]`)?.value ?? '';
      if (value && value !== DEFAULT_RIGGER_LOOKUP[key]) result[key] = value;
    }
    const commandProgram = this.element
      .querySelector('input[name="commandProgram"]')
      ?.value.trim();
    if (
      commandProgram &&
      commandProgram !== DEFAULT_RIGGER_LOOKUP.commandProgram
    )
      result.commandProgram = commandProgram;

    await game.settings.set(
      'shadowrun4e',
      'riggerLookup',
      JSON.stringify(result)
    );
    this.close();
  }

  static async #onReset(_event, _target) {
    await game.settings.set('shadowrun4e', 'riggerLookup', '{}');
    this.render();
  }
}
