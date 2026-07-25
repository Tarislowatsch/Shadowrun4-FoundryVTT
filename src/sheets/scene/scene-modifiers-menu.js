// @ts-nocheck
import { TraditionLabels } from '@models/index';
import { getSceneModifiers, setSceneModifiers } from '@utils/index';

const FIELDS = [
  {
    key: 'backgroundCount',
    type: 'number',
    name: 'sr4.scene.modifiers.backgroundCount.name',
    hint: 'sr4.scene.modifiers.backgroundCount.hint',
  },
  {
    key: 'backgroundCountTradition',
    type: 'select',
    name: 'sr4.scene.modifiers.backgroundCountTradition.name',
    hint: 'sr4.scene.modifiers.backgroundCountTradition.hint',
  },
  {
    key: 'mysticAdeptReduction',
    type: 'select',
    name: 'sr4.scene.modifiers.mysticAdeptReduction.name',
    hint: 'sr4.scene.modifiers.mysticAdeptReduction.hint',
    choices: {
      spellpower: 'sr4.scene.modifiers.mysticAdeptReduction.spellpower',
      powerPoints: 'sr4.scene.modifiers.mysticAdeptReduction.powerPoints',
    },
  },
];

export class SceneModifiersMenu extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @param {{ scene?: object }} [options] */
  constructor({ scene, ...options } = {}) {
    super(options);
    this.scene = scene ?? canvas?.scene;
  }

  static DEFAULT_OPTIONS = {
    id: 'sr4-scene-modifiers-menu',
    window: {
      title: 'sr4.scene.modifiers.title',
      resizable: true,
    },
    position: { width: 480, height: 'auto' },
    actions: {
      save: SceneModifiersMenu.#onSave,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/scene/scene-modifiers-menu.hbs',
    },
  };

  async _prepareContext() {
    const modifiers = getSceneModifiers(this.scene);
    return {
      sceneName: this.scene?.name ?? '',
      fields: FIELDS.map((field) => this.#describe(field, modifiers)),
    };
  }

  #describe(field, modifiers) {
    const value = modifiers[field.key];
    const described = { ...field, value };
    if (field.type === 'select') {
      described.choices = Object.entries(field.choices ?? TraditionLabels).map(
        ([choice, label]) => ({
          value: choice,
          label,
          selected: choice === value,
        })
      );
    }
    return described;
  }

  #read(key) {
    const el = this.element.querySelector(`[name="${key}"]`);
    if (!el) return undefined;
    if (el.type === 'number') {
      const number = Number(el.value);
      return Number.isNaN(number) ? undefined : number;
    }
    return el.value;
  }

  static async #onSave() {
    if (!this.scene) {
      this.close();
      return;
    }
    const data = {};
    for (const field of FIELDS) {
      const value = this.#read(field.key);
      if (value !== undefined) data[field.key] = value;
    }
    await setSceneModifiers(this.scene, data);
    this.close();
  }
}
