// @ts-nocheck

const SECTIONS = [
  {
    label: 'sr4.settings.flowSettingsMenu.sections.workflows',
    keys: [
      'combatDefenseWorkflow',
      'combatSoakWorkflow',
      'cybercombatWorkflow',
      'gmDefenderPicker',
      'applyDamageWorkflow',
    ],
  },
  {
    label: 'sr4.settings.flowSettingsMenu.sections.reactive',
    keys: [
      'decisionMode',
      'decisionModeCombat',
      'decisionModeMagic',
      'decisionModeMatrix',
    ],
  },
  {
    label: 'sr4.settings.flowSettingsMenu.sections.timeouts',
    keys: ['flowEdgeTimeout', 'flowOpposedRollTimeout'],
  },
  {
    label: 'sr4.settings.flowSettingsMenu.sections.client',
    keys: ['spellWorkflow', 'autoSustainEffect'],
  },
];

const FLOW_KEYS = SECTIONS.flatMap((section) => section.keys);
const CUSTOM_KEYS = new Set([
  'decisionModeCombat',
  'decisionModeMagic',
  'decisionModeMatrix',
]);

export class FlowSettingsMenu extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: 'sr4-flow-settings-menu',
    window: {
      title: 'sr4.settings.flowSettingsMenu.title',
      resizable: true,
    },
    position: { width: 560, height: 'auto' },
    actions: {
      save: FlowSettingsMenu.#onSave,
      reset: FlowSettingsMenu.#onReset,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/settings/flow-settings-menu.hbs',
    },
  };

  #describe(key, decisionMode) {
    const cfg = game.settings.settings.get(`shadowrun4e.${key}`);
    const value = game.settings.get('shadowrun4e', key);
    const world = cfg.scope === 'world';
    const field = {
      key,
      name: cfg.name,
      hint: cfg.hint,
      value,
      world,
      disabled: world && !game.user.isGM,
      controller: key === 'decisionMode',
      custom: CUSTOM_KEYS.has(key),
      hidden: CUSTOM_KEYS.has(key) && decisionMode !== 'custom',
    };

    if (cfg.type === Boolean) {
      field.type = 'checkbox';
      field.checked = !!value;
    } else if (cfg.choices) {
      field.type = 'select';
      field.choices = Object.entries(cfg.choices).map(([choice, label]) => ({
        value: choice,
        label,
        selected: choice === value,
      }));
    } else if (cfg.type === Number) {
      field.type = 'number';
      field.min = cfg.range?.min;
      field.max = cfg.range?.max;
      field.step = cfg.range?.step;
    } else {
      field.type = 'text';
    }
    return field;
  }

  async _prepareContext() {
    const decisionMode = game.settings.get('shadowrun4e', 'decisionMode');
    return {
      isGM: game.user.isGM,
      sections: SECTIONS.map((section) => ({
        label: section.label,
        fields: section.keys.map((key) => this.#describe(key, decisionMode)),
      })),
    };
  }

  _onRender(_context, _options) {
    const controller = this.element.querySelector('[data-flow-controller]');
    if (controller) {
      const sync = () => {
        const custom = controller.value === 'custom';
        for (const el of this.element.querySelectorAll('[data-flow-custom]'))
          el.style.display = custom ? 'flex' : 'none';
      };
      controller.addEventListener('change', sync);
      sync();
    }

    const defense = this.element.querySelector(
      '[name="combatDefenseWorkflow"]'
    );
    const soak = this.element.querySelector('[name="combatSoakWorkflow"]');
    if (game.user.isGM && defense && soak) {
      const sync = () => {
        soak.disabled = !defense.checked;
        if (!defense.checked) soak.checked = false;
      };
      defense.addEventListener('change', sync);
      sync();
    }
  }

  #read(key) {
    const el = this.element.querySelector(`[name="${key}"]`);
    if (!el) return undefined;
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number') {
      const number = Number(el.value);
      return Number.isNaN(number) ? undefined : number;
    }
    return el.value;
  }

  static async #onSave() {
    const isGM = game.user.isGM;
    for (const key of FLOW_KEYS) {
      const cfg = game.settings.settings.get(`shadowrun4e.${key}`);
      if (cfg.scope === 'world' && !isGM) continue;
      const value = this.#read(key);
      if (value === undefined) continue;
      if (value !== game.settings.get('shadowrun4e', key))
        await game.settings.set('shadowrun4e', key, value);
    }
    this.close();
  }

  static async #onReset() {
    const isGM = game.user.isGM;
    for (const key of FLOW_KEYS) {
      const cfg = game.settings.settings.get(`shadowrun4e.${key}`);
      if (cfg.scope === 'world' && !isGM) continue;
      if (game.settings.get('shadowrun4e', key) !== cfg.default)
        await game.settings.set('shadowrun4e', key, cfg.default);
    }
    this.render();
  }
}
