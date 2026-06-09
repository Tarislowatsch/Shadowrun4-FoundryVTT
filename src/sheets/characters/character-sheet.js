import { getGame, handleSkillRoll, openActionDialog } from '@utils/index';
import {
  ActionType,
  Attackskill,
  DamageTypes,
  DrainAttributes,
  Shootingmodes,
  SR4Attributes,
  Traditions,
} from '@models/index';
import { SR4EffectTargets } from '@effects/index';
import SR4ActiveEffectSheet from '@sheets/effects/SR4ActiveEffectSheet';

export default class SR4CharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'character', 'sheet-container'],
    position: { width: 1400, height: 800 },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      editToggle: SR4CharacterSheet.#onEditToggle,
      deleteItem: SR4CharacterSheet.#onDeleteItem,
      editItem: SR4CharacterSheet.#onEditItem,
      toggleEquip: SR4CharacterSheet.#onToggleEquip,
      castSpell: SR4CharacterSheet.#onCastSpell,
      rollSkill: SR4CharacterSheet.#onRollSkill,
      monitorBox: SR4CharacterSheet.#onMonitorBox,
      attackRoll: SR4CharacterSheet.#onAttackRoll,
      rollAction: SR4CharacterSheet.#onRollAction,
      createEffect: SR4CharacterSheet.#onCreateEffect,
      toggleEffect: SR4CharacterSheet.#onToggleEffect,
      editEffect: SR4CharacterSheet.#onEditEffect,
      deleteEffect: SR4CharacterSheet.#onDeleteEffect,
    },
  };

  static PARTS = {
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
    },
    main: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/main.tab.hbs',
      scrollable: [''],
    },
    skills: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/skills.tab.hbs',
      scrollable: [''],
    },
    weapons: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/weapons.tab.hbs',
      scrollable: [''],
    },
    defense: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/defense.tab.hbs',
      scrollable: [''],
    },
    inventory: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/inventory.tab.hbs',
      scrollable: [''],
    },
    magic: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/magic.tab.hbs',
      scrollable: [''],
    },
    actions: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/actions.tab.hbs',
      scrollable: [''],
    },
    modifiers: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/modifiers.tab.hbs',
    },
    effects: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/effects.tab.hbs',
      scrollable: [''],
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'main', icon: 'fas fa-user', label: 'sr4.tab.main' },
        { id: 'skills', icon: 'fas fa-dice-d20', label: 'sr4.tab.skills' },
        { id: 'weapons', icon: 'fas fa-crosshairs', label: 'sr4.tab.weapons' },
        { id: 'defense', icon: 'fas fa-shield-alt', label: 'sr4.tab.defense' },
        {
          id: 'inventory',
          icon: 'fas fa-briefcase',
          label: 'sr4.tab.inventory',
        },
        { id: 'magic', icon: 'fas fa-book', label: 'sr4.tab.magic' },
        {
          id: 'actions',
          icon: 'fas fa-clipboard-list',
          label: 'sr4.tab.actions',
        },
        {
          id: 'modifiers',
          icon: 'fas fa-sliders-h',
          label: 'sr4.tab.modifiers',
        },
        { id: 'effects', icon: 'fas fa-magic', label: 'sr4.tab.effects' },
      ],
      initial: 'main',
    },
  };

  /** @type {boolean} */
  editMode = false;

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    const actorData = this.document.toObject(false);
    const items = actorData.items || [];
    return {
      editMode: this.editMode,
      tabs: this._prepareTabs('primary'),
      ...this._getStaticContext(actorData),
      ...this._getItemContext(items),
      ...this._getMagicContext(actorData),
      ...this._getComputedStats(actorData),
      ...this._getEffectsContext(),
    };
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'main':
      case 'skills':
      case 'weapons':
      case 'defense':
      case 'inventory':
      case 'magic':
      case 'actions':
      case 'modifiers':
      case 'effects':
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  _getStaticContext(actorData) {
    return {
      headerArray: [0, 1, 2],
      actor: {
        img: actorData.img,
        name: actorData.name,
        uuid: actorData._id,
      },
      system: actorData.system,
      meleeDmgBonus: Math.ceil((actorData.system.sheetStats.STRENGTH ?? 0) / 2),
      flags: actorData.flags,
      config: CONFIG.SR4,
      traditions: Traditions,
      drainAttributes: DrainAttributes,
      attributes: SR4Attributes,
      shootingmodes: Shootingmodes,
      actiontypes: ActionType,
      attackskills: Attackskill,
      damageTypes: DamageTypes,
      textFields: [
        'name',
        'metatype',
        'eyecolor',
        'haircolor',
        'skincolor',
        'gender',
      ],
      isTechnomancer: actorData.system.technomancer,
      effectTargets: SR4EffectTargets,
    };
  }

  _getItemContext(items) {
    const powers = items.filter((i) => i.type === 'Power');
    return {
      weapons: items.filter(
        (i) => i.type === 'Ranged Weapon' || i.type === 'Melee Weapon'
      ),
      skills: items
        .filter((i) => i.type === 'Skill')
        .sort((a, b) => {
          const labelA = a.system.label
            ? getGame().i18n?.localize(a.system.label)
            : a.name;
          const labelB = b.system.label
            ? getGame().i18n?.localize(b.system.label)
            : b.name;
          return labelA.localeCompare(labelB);
        }),
      items: items.filter((i) => i.type === 'Item'),
      implants: items.filter((i) => i.type === 'Implant'),
      spells: items.filter((i) => i.type === 'Spell'),
      powers,
      totalPowerCost: powers.reduce((sum, p) => sum + (p.system.cost ?? 0), 0),
      armor: items.filter((i) => i.type === 'Armor'),
      actions: items.filter((i) => i.type === 'Action'),
      foci: items.filter((i) => i.type === 'Focus' || i.type === 'Fetish'),
    };
  }

  _getEffectsContext() {
    return {
      effects: this.document.effects.contents.map((e) => ({
        id: e.id,
        name: e.name,
        img: e.img ?? 'icons/svg/aura.svg',
        active: !e.disabled,
        key: e.changes[0]?.key ?? '',
        mode:
          { 1: 'multiply', 2: 'add', 5: 'override' }[e.changes[0]?.mode] ??
          'add',
        value: Number(e.changes[0]?.value ?? 0),
        description: e.description ?? '',
      })),
    };
  }

  _getMagicContext(actorData) {
    const sheetStats = actorData.system.sheetStats;
    const drainAttr = actorData.system.magic?.drainAttribute ?? 'LOGIC';
    const drainStatValue = sheetStats?.[drainAttr] ?? 0;
    return {
      drainStatValue,
      drainPool: (sheetStats?.WILLPOWER ?? 0) + drainStatValue,
      hasMagic:
        actorData.system.magic?.adept || actorData.system.magic?.magician,
    };
  }

  _getComputedStats(actorData) {
    const derived = this.document.system.derivedStats;
    return {
      computedStats: {
        ...actorData.system.sheetStats,
        INITIATIVE: derived?.initiative?.physical ?? 0,
        MATRIXINITIATIVE: derived?.initiative?.matrix ?? 0,
        ASTRALINITIATIVE: derived?.initiative?.astral ?? 0,
      },
      derivedKeys: ['INITIATIVE', 'MATRIXINITIATIVE', 'ASTRALINITIATIVE'],
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    const headerControls = frame.querySelector(
      '.window-header .header-control'
    );

    const toggle = document.createElement('label');
    toggle.className = 'switch edit-mode-switch';
    toggle.dataset.tooltip = 'Edit Mode';
    toggle.innerHTML = `
      <input type="checkbox" ${this.editMode ? 'checked' : ''}>
      <span class="slider"></span>
    `;

    toggle.querySelector('input')?.addEventListener('change', (ev) => {
      this.editMode = ev.currentTarget.checked;
      this.render();
    });

    if (headerControls?.parentElement) {
      headerControls.parentElement.prepend(toggle);
    }

    return frame;
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  _onRender(context, options) {
    super._onRender?.(context, options);

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) => {
        input.addEventListener('focus', () => input.select());
      });

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this._saveActorForm();
          }
        });
      });

    this.element
      .querySelectorAll('.item-list input, .item-list select')
      .forEach((el) => {
        el.addEventListener('change', async (event) => {
          const target = event.currentTarget;
          const itemEl = target.closest('.item');
          if (!itemEl) return;
          const itemId = itemEl.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (!item) return;
          const field = target.name;
          let value = target.value;

          if (target.type === 'checkbox') {
            value = target.checked;
          } else if (target.dataset.dtype === 'Number') {
            value = Number(value);
          }
          await item.update({ [field]: value });
        });
      });

    this.element
      .querySelector('[data-edit="img"]')
      ?.addEventListener('click', () => {
        new foundry.applications.apps.FilePicker.implementation({
          type: 'image',
          current: this.actor.img,
          callback: (path) => this.actor.update({ img: path }),
        }).browse();
      });

    this.element
      .querySelector('#skill-search')
      ?.addEventListener('input', (event) => {
        const query = event.currentTarget.value.toLowerCase().trim();
        this.element.querySelectorAll('.skill').forEach((el) => {
          const name = (el.dataset.skillName || '').toLowerCase();
          el.classList.toggle(
            'hidden',
            query.length > 0 && !name.includes(query)
          );
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static #onEditToggle(event, target) {
    this.editMode = !this.editMode;
    this.render();
  }

  static async #onDeleteItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  static async #onEditItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    this.actor.items.get(itemId)?.sheet?.render(true);
  }

  static async #onToggleEquip(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ 'system.equipped': !item.system.equipped });
  }

  static #onCastSpell(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    this.actor.castSpell(itemId);
  }

  static #onRollSkill(event, target) {
    const skill = target.dataset.skill;
    if (skill) this.actor.rollSkill?.(skill);
  }

  static async #onMonitorBox(event, target) {
    const index = Number(target.dataset.index);
    const type =
      target.dataset.type ?? target.closest('.monitor-track')?.dataset.type;
    if (!type) return;
    const path = `system.conditionMonitor.${type}.current`;
    const current = foundry.utils.getProperty(this.actor, path);
    const newValue = index + 1 === current ? index : index + 1;
    await this.actor.update({ [path]: newValue });
  }

  static async #onAttackRoll(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const skillKey = target.dataset.attackSkill;
    if (!itemId || !skillKey) return;
    const weapon = foundry.utils.deepClone(this.actor.items.get(itemId));
    const skillName = this.actor.findByAttackSkill(skillKey)?.name;
    if (!skillName || !weapon) return;
    await handleSkillRoll(this.actor, skillName, weapon);
  }

  static async #onRollAction(event, target) {
    const rating1 = Number(target.dataset.rating1) || 0;
    const rating2 = Number(target.dataset.rating2) || 0;
    const action1 = target.dataset.action1;
    const action2 = target.dataset.action2;
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    const numDice = rating1 + rating2;

    if (!item || numDice < 1) {
      ui?.notifications?.error(
        game.i18n.localize('sr4.action.noRatingForAction')
      );
      return;
    }

    const actionName = `${item.name} (${action1}${action2 ? ` + ${action2}` : ''})`;
    openActionDialog(this.actor, actionName, numDice);
  }

  // ── Effect actions ──────────────────────────────────────────────────────────

  static async #onCreateEffect(event, target) {
    await this.actor.createEmbeddedDocuments('ActiveEffect', [
      {
        name: game.i18n.localize('sr4.effect.new'),
        changes: [{ key: 'system.sheetStats.BODY', type: 'add', value: 0 }],
        disabled: false,
      },
    ]);
  }

  static async #onToggleEffect(event, target) {
    const effectId =
      target.dataset.effectId ??
      target.closest('[data-effect-id]')?.dataset.effectId;
    if (!effectId) return;
    const effect = this.actor.effects.get(effectId);
    if (!effect) return;
    await effect.update({ disabled: !effect.disabled });
  }

  static async #onEditEffect(event, target) {
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    if (!effectId) return;
    const effect = this.actor.effects.get(effectId);
    if (!effect) return;
    new SR4ActiveEffectSheet({ document: effect }).render(true);
  }

  static async #onDeleteEffect(event, target) {
    const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
    if (!effectId) return;
    await this.actor.deleteEmbeddedDocuments('ActiveEffect', [effectId]);
  }
}
