import { handleSkillRoll, openActionDialog } from '@utils/index';
import { SummoningFlow } from '@flows/summoning-flow.js';
import {
  ActionType,
  AmmoCategory,
  Attackskill,
  DamageTypes,
  DrainAttributes,
  ImplantGrades,
  ImplantTypes,
  Shootingmodes,
  SR4Attributes,
  Traditions,
} from '@models/index';
import { SR4EffectTargets } from '@effects/index';
import SR4ActiveEffectSheet from '@sheets/effects/SR4ActiveEffectSheet';
import { buildWeaponContext } from './weapon-context.js';
import { buildArmorContext } from './armor-context.js';
import {
  buildComputedStats,
  computeEssenceLoss,
  sortSkillsByLabel,
} from './actor-context.js';
import SR4BaseActorSheet from './sr4-base-actor-sheet.js';

export default class SR4CharacterSheet extends SR4BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['shadowrun4e', 'sheet', 'actor', 'character', 'sheet-container'],
    position: { width: 1400, height: 800 },
    window: {
      resizable: true,
    },
    actions: {
      editToggle: SR4CharacterSheet.#onEditToggle,
      castSpell: SR4CharacterSheet.#onCastSpell,
      rollSkill: SR4CharacterSheet.#onRollSkill,
      threadComplexForm: SR4CharacterSheet.#onThreadComplexForm,
      createEffect: SR4CharacterSheet.#onCreateEffect,
      toggleEffect: SR4CharacterSheet.#onToggleEffect,
      editEffect: SR4CharacterSheet.#onEditEffect,
      deleteEffect: SR4CharacterSheet.#onDeleteEffect,
      createConnection: SR4CharacterSheet.#onCreateConnection,
      deleteConnection: SR4CharacterSheet.#onDeleteConnection,
      summonSpirit: SR4CharacterSheet.#onSummonSpirit,
      summonWatcher: SR4CharacterSheet.#onSummonWatcher,
      compileSprite: SR4CharacterSheet.#onCompileSprite,
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
    bio: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/bio.tab.hbs',
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
    implants: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/implants.tab.hbs',
      scrollable: [''],
    },
    magic: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/magic.tab.hbs',
      scrollable: [''],
    },
    matrix: {
      template:
        'systems/shadowrun4e/templates/sheets/characters/partials/tabs/matrix.tab.hbs',
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
        { id: 'bio', icon: 'fas fa-id-card', label: 'sr4.tab.bio' },
        { id: 'weapons', icon: 'fas fa-crosshairs', label: 'sr4.tab.weapons' },
        { id: 'defense', icon: 'fas fa-shield-alt', label: 'sr4.tab.defense' },
        {
          id: 'inventory',
          icon: 'fas fa-briefcase',
          label: 'sr4.tab.inventory',
        },
        {
          id: 'implants',
          icon: 'fas fa-microchip',
          label: 'sr4.tab.implants',
        },
        { id: 'magic', icon: 'fas fa-book', label: 'sr4.tab.magic' },
        { id: 'matrix', icon: 'fas fa-wifi', label: 'sr4.tab.matrix' },
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

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    const actorData = this.document.toObject(false);
    const { sourceStats, sourceModifiers } = this._getSourceContext();
    const items = actorData.items || [];
    return {
      editMode: this.editMode,
      tabs: this._prepareTabs('primary'),
      sourceStats,
      sourceModifiers,
      ...this._getStaticContext(actorData),
      ...this._getItemContext(items),
      ...(await this._getMagicContext(actorData)),
      ...(await this._getMatrixContext(actorData)),
      ...buildComputedStats(
        actorData,
        this.document.system.derivedStats,
        sourceStats,
        sourceModifiers
      ),
      ...this._getEffectsContext(),
    };
  }

  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'main':
      case 'bio':
      case 'weapons':
      case 'defense':
      case 'inventory':
      case 'implants':
      case 'magic':
      case 'matrix':
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
      flags: actorData.flags,
      config: CONFIG.SR4,
      traditions: Traditions,
      drainAttributes: DrainAttributes,
      attributes: SR4Attributes,
      shootingmodes: Shootingmodes,
      actiontypes: ActionType,
      attackskills: Attackskill,
      damageTypes: DamageTypes,
      textFields: { lifestyle: true },
      isTechnomancer: actorData.system.technomancer,
      effectTargets: SR4EffectTargets,
      resistanceElements: SR4BaseActorSheet._buildResistanceElements(),
    };
  }

  _getItemContext(items) {
    const powers = this._enrichItemContext(items, 'Power');
    const sys = this.document.system;
    const implants = this._enrichItemContext(items, 'Implant');
    return {
      weapons: buildWeaponContext(items, {
        meleeDmgBonus: sys.derivedStats.meleeDamageBonus ?? 0,
        meleeDamageModifier: sys.modifiers?.meleeDamageModifier ?? 0,
        unarmedDamageModifier: sys.modifiers?.unarmedDamageModifier ?? 0,
      }),
      skills: sortSkillsByLabel(items),
      items: items.filter((i) => i.type === 'Item'),
      ...SR4CharacterSheet.#buildImplantContext(implants, sys),
      spells: this._enrichItemContext(items, 'Spell'),
      powers,
      totalPowerCost: powers.reduce(
        (sum, p) => sum + (p.system.totalCost ?? 0),
        0
      ),
      armor: buildArmorContext(items),
      positiveQualities: items.filter(
        (i) => i.type === 'Quality' && i.system.category !== 'Negative'
      ),
      negativeQualities: items.filter(
        (i) => i.type === 'Quality' && i.system.category === 'Negative'
      ),
      ammo: items
        .filter((i) => i.type === 'Ammo')
        .map((a) => ({
          ...a,
          displayCategory: a.system.category
            ? (AmmoCategory[a.system.category] ?? a.system.category)
            : null,
        })),
      actions: items.filter((i) => i.type === 'Action'),
      foci: items.filter((i) => i.type === 'Focus' || i.type === 'Fetish'),
      commlinks: items.filter((i) => i.type === 'Commlink'),
      programs: items.filter((i) => i.type === 'Program'),
      complexForms: items.filter(
        (i) => i.type === 'Skill' && i.system.type === 'complexForm'
      ),
      metatypeItem: items.find((i) => i.type === 'Metatype') ?? null,
    };
  }

  _getEffectsContext() {
    return {
      effects: this.document.effects.contents.map((e) => ({
        id: e.id,
        name: e.name,
        img: e.img ?? 'icons/svg/aura.svg',
        active: !e.disabled,
        changes: e.changes.map((c) => {
          const key = c.key ?? '';
          const i18nKey = SR4EffectTargets[key];
          return {
            key,
            targetLabel: i18nKey
              ? game.i18n.localize(i18nKey)
              : key.split('.').pop(),
            mode: c.type ?? 'add',
            value: Number(c.value ?? 0),
          };
        }),
        description: e.description ?? '',
      })),
    };
  }

  async _getMatrixContext(actorData) {
    if (!actorData.system.technomancer) return {};
    const stats = actorData.system.sheetStats;
    const bonuses = actorData.system.livingPersona;
    return {
      spriteBindingCategories: await SR4CharacterSheet.#buildBindingCategories(
        actorData.system.magic?.spriteBindings,
        'sr4.magic.spriteBindings',
        'sprite'
      ),
      livingPersona: {
        response: (stats.INTUITION ?? 0) + (bonuses.responseBonus ?? 0),
        signal:
          Math.ceil((stats.RESONANCE ?? 0) / 2) + (bonuses.signalBonus ?? 0),
        firewall: (stats.WILLPOWER ?? 0) + (bonuses.firewallBonus ?? 0),
        system: (stats.LOGIC ?? 0) + (bonuses.systemBonus ?? 0),
        biofeedbackFilter:
          (stats.CHARISMA ?? 0) + (bonuses.biofeedbackFilterBonus ?? 0),
        vrMatrixInitiative: (stats.INTUITION ?? 0) * 2 + 1,
        vrMatrixInitiativePasses: 3,
      },
    };
  }

  async _getMagicContext(actorData) {
    const sheetStats = actorData.system.sheetStats;
    const drainAttr = actorData.system.magic?.drainAttribute ?? 'LOGIC';
    const drainStatValue = sheetStats?.[drainAttr] ?? 0;
    return {
      drainStatValue,
      drainPool: (sheetStats?.WILLPOWER ?? 0) + drainStatValue,
      hasMagic:
        actorData.system.magic?.adept || actorData.system.magic?.magician,
      spiritBindingCategories: await SR4CharacterSheet.#buildBindingCategories(
        actorData.system.magic?.spiritBindings,
        'sr4.magic.spiritBindings',
        'spirit'
      ),
    };
  }

  static #buildImplantContext(implants, sys) {
    for (const item of implants) {
      item.displayType =
        ImplantTypes[item.system.type] ?? item.system.type ?? '';
      item.displayGrade =
        ImplantGrades[item.system.grade] ?? item.system.grade ?? '';
    }
    const groups = Object.entries(ImplantTypes).map(([key, label]) => ({
      label: game.i18n.localize(label),
      items: implants.filter((i) => i.system.type === key),
    }));
    const cyberEss = sys.derivedStats?.essenceLossCyber ?? 0;
    const bioEss = sys.derivedStats?.essenceLossBio ?? 0;
    const essenceLoss = computeEssenceLoss(cyberEss, bioEss);
    return {
      implantsByType: groups.filter((g) => g.items.length > 0),
      essenceCyber: cyberEss.toFixed(2),
      essenceBio: bioEss.toFixed(2),
      essenceHalved: (cyberEss >= bioEss ? bioEss / 2 : cyberEss / 2).toFixed(
        2
      ),
      essenceHalvedLabel: cyberEss >= bioEss ? 'bio' : 'cyber',
      essenceLoss: essenceLoss.toFixed(2),
      currentEssence: ((sys.sheetStats?.ESSENCE ?? 6) - essenceLoss).toFixed(2),
    };
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  _onRender(context, options) {
    super._onRender(context, options);

    const { signal } = this._listenerAbort;

    this.element
      .querySelectorAll('input[type="number"], input[type="text"]')
      .forEach((input) => {
        input.addEventListener(
          'keydown',
          (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              this._saveActorForm();
            }
          },
          { signal }
        );
      });

    this.element.querySelector('#skill-search')?.addEventListener(
      'input',
      (event) => {
        const query = event.currentTarget.value.toLowerCase().trim();
        this.element.querySelectorAll('.skill').forEach((el) => {
          const name = (el.dataset.skillName || '').toLowerCase();
          el.classList.toggle(
            'hidden',
            query.length > 0 && !name.includes(query)
          );
        });
      },
      { signal }
    );
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  static #onEditToggle(event, target) {
    this.editMode = !this.editMode;
    this.render();
  }

  static #onCastSpell(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    this.actor.castSpell(itemId);
  }

  static async #onThreadComplexForm(event, target) {
    const softwareSkill = this.actor.items.find(
      (i) => i.type === 'Skill' && i.name === 'Software'
    );
    const softwareRating = softwareSkill?.system.rating ?? 0;
    const resonance = this.actor.system.sheetStats.RESONANCE ?? 0;
    openActionDialog(
      this.actor,
      game.i18n.localize('sr4.matrix.threading'),
      softwareRating + resonance
    );
  }

  static async #onRollSkill(event, target) {
    const skill = target.dataset.skill;
    if (skill) await handleSkillRoll(this.actor, skill);
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

  // ── Connection actions ──────────────────────────────────────────────────────

  static async #onCreateConnection(event, target) {
    await this.actor.update({
      [`system.connections.${foundry.utils.randomID()}`]: {},
    });
  }

  static async #onDeleteConnection(event, target) {
    const key =
      target.dataset.connectionKey ??
      target.closest('[data-connection-key]')?.dataset.connectionKey;
    if (!key) return;
    await this.actor.update({ [`system.connections.-=${key}`]: null });
  }

  // ── Summoning / Compiling actions ─────────────────────────────────────────

  static async #onSummonSpirit() {
    await SummoningFlow.start(this.actor, 'spirit');
  }

  static async #onSummonWatcher() {
    await SummoningFlow.startWatcher(this.actor);
  }

  static async #onCompileSprite() {
    await SummoningFlow.start(this.actor, 'sprite');
  }

  /**
   * @param {Record<string, string>} bindings
   * @param {string} i18nPrefix
   * @param {'spirit' | 'sprite'} entityType
   */
  static async #buildBindingCategories(bindings, i18nPrefix, entityType) {
    const categories = [
      'COMBAT',
      'DETECTION',
      'HEALTH',
      'ILLUSION',
      'MANIPULATION',
    ];

    const settingKey =
      entityType === 'sprite' ? 'spriteCompendium' : 'spiritCompendium';
    const packId = game.settings.get('shadowrun4e', settingKey) ?? '';
    let templateNames = null;

    if (packId) {
      const pack = game.packs.get(packId);
      if (pack) {
        const index = await pack.getIndex();
        const names = [...new Set(index.map((e) => e.name).filter(Boolean))];
        if (names.length > 0) templateNames = names;
      }
    }

    return categories.map((key) => ({
      key,
      label: game.i18n.localize(`${i18nPrefix}.${key}`),
      value: bindings?.[key] ?? '',
      options: templateNames,
    }));
  }
}
