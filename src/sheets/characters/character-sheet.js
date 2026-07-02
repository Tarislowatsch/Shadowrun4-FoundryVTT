import { handleSkillRoll, rollComplexFormDialog } from '@utils/index';
import { SummoningFlow } from '@flows/summoning-flow.js';
import { ThreadingFlow } from '@flows/threading-flow.js';
import {
  ActionType,
  Attackskill,
  DamageTypes,
  DrainAttributes,
  Shootingmodes,
  SR4Attributes,
  TraditionLabels,
} from '@models/index';
import { SR4EffectTargets } from '@effects/index';
import { buildWeaponContext } from './weapon-context.js';
import { buildArmorContext } from './armor-context.js';
import {
  buildAmmoContext,
  buildComputedStats,
  sortSkillsByLabel,
} from './actor-context.js';
import { buildImplantContext } from './implant-context.js';
import { buildMagicContext } from './magic-context.js';
import { buildMatrixContext } from './matrix-context.js';
import { buildEffectsContext } from './effects-context.js';
import { buildVehicleContext } from './vehicle-context.js';
import {
  onCreateEffect,
  onToggleEffect,
  onEditEffect,
  onDeleteEffect,
} from './effect-actions.js';
import {
  onCreateConnection,
  onDeleteConnection,
} from './connection-actions.js';
import {
  onOpenLinkedActor,
  onBindLinkedActor,
} from './linked-actor-actions.js';
import { CharacterImporterApp } from '@sheets/importer/character-importer-app.js';
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
      useComplexForm: SR4CharacterSheet.#onUseComplexForm,
      createEffect: onCreateEffect,
      toggleEffect: onToggleEffect,
      editEffect: onEditEffect,
      deleteEffect: onDeleteEffect,
      createConnection: onCreateConnection,
      deleteConnection: onDeleteConnection,
      openLinkedActor: onOpenLinkedActor,
      bindLinkedActor: onBindLinkedActor,
      summonSpirit: SR4CharacterSheet.#onSummonSpirit,
      summonWatcher: SR4CharacterSheet.#onSummonWatcher,
      compileSprite: SR4CharacterSheet.#onCompileSprite,
      createSpriteTemplate: SR4CharacterSheet.#onCreateSpriteTemplate,
      createSpiritTemplate: SR4CharacterSheet.#onCreateSpiritTemplate,
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

  async _prepareContext(_options) {
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
      ...this._getBaseActorContext(actorData),
      traditions: TraditionLabels,
      drainAttributes: DrainAttributes,
      attributes: SR4Attributes,
      shootingmodes: Shootingmodes,
      actiontypes: ActionType,
      attackskills: Attackskill,
      damageTypes: DamageTypes,
      textFields: { lifestyle: true },
      isTechnomancer: actorData.system.technomancy?.technomancer ?? false,
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
      ...buildImplantContext(implants, sys),
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
      ammo: buildAmmoContext(items),
      riggedVehicles: buildVehicleContext(this.document.uuid),
      actions: items.filter((i) => i.type === 'Action'),
      foci: items.filter((i) => i.type === 'Focus' || i.type === 'Fetish'),
      commlinks: items.filter((i) => i.type === 'Commlink'),
      complexForms: items
        .filter((i) => i.type === 'Program' && i.system.complexform)
        .sort((a, b) => a.name.localeCompare(b.name)),
      programs: items.filter(
        (i) =>
          i.type === 'Program' &&
          !(this.actor.system.technomancy?.technomancer && i.system.complexform)
      ),
      metatypeItem: items.find((i) => i.type === 'Metatype') ?? null,
    };
  }

  _getEffectsContext() {
    return buildEffectsContext(this.document.effects);
  }

  async _getMatrixContext(actorData) {
    return buildMatrixContext(actorData, this.document.uuid);
  }

  async _getMagicContext(actorData) {
    return buildMagicContext(actorData, this.document.uuid);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    const headerControls = frame.querySelector(
      '.window-header .header-control'
    );

    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/shadowrun4e/templates/ui/import-update-button.hbs',
      {}
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const button = /** @type {HTMLElement} */ (wrapper.firstElementChild);

    button.addEventListener('click', () => {
      new CharacterImporterApp({ actor: this.actor }).render(true);
    });

    if (headerControls?.parentElement) {
      headerControls.parentElement.prepend(button);
    }

    return frame;
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

  static #onEditToggle(_event, _target) {
    this.editMode = !this.editMode;
    this.render();
  }

  static #onCastSpell(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    this.actor.castSpell(itemId);
  }

  static async #onThreadComplexForm(_event, _target) {
    await ThreadingFlow.start(this.actor);
  }

  static async #onUseComplexForm(_event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    const complexForm = this.actor.items.get(itemId);
    if (!complexForm) return;
    await rollComplexFormDialog(this.actor, complexForm);
  }

  static async #onRollSkill(event, target) {
    const skill = target.dataset.skill;
    if (skill) await handleSkillRoll(this.actor, skill);
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

  static async #onCreateSpriteTemplate(event) {
    const spriteType = event.currentTarget.dataset.typeKey;
    const name = game.i18n.localize(`sr4.matrix.spriteTypes.${spriteType}`);
    await Actor.create(
      { name, type: 'sprite', system: { spriteType, rating: 1 } },
      { renderSheet: true }
    );
  }

  static async #onCreateSpiritTemplate(event) {
    const spiritType = event.currentTarget.dataset.typeKey;
    const name = game.i18n.localize(`sr4.magic.spiritAffinities.${spiritType}`);
    await Actor.create(
      { name, type: 'spirit', system: { spiritType, force: 1 } },
      { renderSheet: true }
    );
  }
}
