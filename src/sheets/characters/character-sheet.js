import { TEMPLATES, renderTemplate } from '@utils/templates';
import { rollComplexFormDialog } from '@utils/index';
import { handleSkillRoll } from '@domains/combat/dialogs/index.js';
import { SummoningFlow } from '@domains/summoned-entity/flow/summoning-flow.js';
import { DismissalFlow } from '@domains/summoned-entity/flow/dismissal-flow.js';
import { BindingFlow } from '@domains/summoned-entity/flow/binding-flow.js';
import { ThreadingFlow } from '@domains/resonance/threading-flow.js';
import { CybercombatFlow } from '@domains/matrix/flow/cybercombat-flow.js';
import {
  ActionType,
  Attackskill,
  BiocompatibilityTypes,
  DamageTypes,
  DrainAttributes,
  powerPointCost,
  Shootingmodes,
  SR4Attributes,
  TraditionLabels,
} from '@models/index';
import {
  SR4EffectTargets,
  buildMentorContext,
  selectMentorChoice,
  setPowerSuppressed,
} from '@effects/index';
import { buildWeaponContext } from './weapon-context.js';
import { buildArmorContext } from './armor-context.js';
import {
  buildAmmoContext,
  buildComputedStats,
  sortSkillsByLabel,
} from './actor-context.js';
import { buildImplantContext } from './implant-context.js';
import { buildInventoryContext } from './inventory-context.js';
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
import {
  buildResistanceElements,
  buildRealmOptions,
  buildSimModeOptions,
} from './resistance-actions.js';

export default class SR4CharacterSheet extends SR4BaseActorSheet {
  /** @type {boolean} */
  hideNoRatingSkills = false;

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
      matrixAttack: SR4CharacterSheet.#onMatrixAttack,
      matrixJackOut: SR4CharacterSheet.#onMatrixJackOut,
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
      decompileSprite: SR4CharacterSheet.#onDecompileSprite,
      banishSpirit: SR4CharacterSheet.#onBanishSpirit,
      bindSpirit: SR4CharacterSheet.#onBindSpirit,
      bindSprite: SR4CharacterSheet.#onBindSprite,
      createSpriteTemplate: SR4CharacterSheet.#onCreateSpriteTemplate,
      createSpiritTemplate: SR4CharacterSheet.#onCreateSpiritTemplate,
      createMentor: SR4CharacterSheet.#onCreateMentor,
      togglePowerSuppressed: SR4CharacterSheet.#onTogglePowerSuppressed,
    },
  };

  static PARTS = {
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
    },
    main: {
      template: TEMPLATES.sheets.characters.tabs.main,
      scrollable: [''],
    },
    bio: {
      template: TEMPLATES.sheets.characters.tabs.bio,
      scrollable: [''],
    },
    weapons: {
      template: TEMPLATES.sheets.characters.tabs.weapons,
      scrollable: [''],
    },
    defense: {
      template: TEMPLATES.sheets.characters.tabs.defense,
      scrollable: [''],
    },
    inventory: {
      template: TEMPLATES.sheets.characters.tabs.inventory,
      scrollable: [''],
    },
    implants: {
      template: TEMPLATES.sheets.characters.tabs.implants,
      scrollable: [''],
    },
    magic: {
      template: TEMPLATES.sheets.characters.tabs.magic,
      scrollable: [''],
    },
    matrix: {
      template: TEMPLATES.sheets.characters.tabs.matrix,
      scrollable: [''],
    },
    actions: {
      template: TEMPLATES.sheets.characters.tabs.actions,
      scrollable: [''],
    },
    modifiers: {
      template: TEMPLATES.sheets.characters.tabs.modifiers,
    },
    effects: {
      template: TEMPLATES.sheets.characters.tabs.effects,
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
      hideNoRatingSkills: this.hideNoRatingSkills,
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
      biocompatibilityOptions: BiocompatibilityTypes,
      attributes: SR4Attributes,
      shootingmodes: Shootingmodes,
      actiontypes: ActionType,
      attackskills: Attackskill,
      damageTypes: DamageTypes,
      textFields: { lifestyle: true },
      isTechnomancer: actorData.system.technomancy?.technomancer ?? false,
      effectTargets: SR4EffectTargets,
      resistanceElements: buildResistanceElements(),
      realmOptions: buildRealmOptions(this.actor),
      simModeOptions: buildSimModeOptions(),
    };
  }

  _getItemContext(items) {
    const powers = this._enrichItemContext(items, 'Power');
    const sys = this.document.system;
    const implants = this._enrichItemContext(items, 'Implant');
    this._enrichItemContext(items, 'Quality');
    const mentorItem =
      this.actor.items.find(
        (i) => i.type === 'Mentor' && !i.system.isParagon
      ) ?? null;
    const paragonItem =
      this.actor.items.find((i) => i.type === 'Mentor' && i.system.isParagon) ??
      null;
    return {
      mentorContext: mentorItem ? buildMentorContext(mentorItem) : null,
      mentorItemId: mentorItem?.id ?? null,
      paragonContext: paragonItem ? buildMentorContext(paragonItem) : null,
      paragonItemId: paragonItem?.id ?? null,
      weapons: buildWeaponContext(items, {
        meleeDmgBonus: sys.derivedStats.meleeDamageBonus ?? 0,
        meleeDamageModifier: sys.modifiers?.meleeDamageModifier ?? 0,
        unarmedDamageModifier: sys.modifiers?.unarmedDamageModifier ?? 0,
      }),
      skills: sortSkillsByLabel(items),
      ...buildImplantContext(implants, sys),
      spells: this._enrichItemContext(items, 'Spell'),
      powers,
      totalPowerCost: powers.reduce(
        (sum, p) => sum + powerPointCost(p.system),
        0
      ),
      armor: buildArmorContext(items),
      ammo: buildAmmoContext(items),
      riggedVehicles: buildVehicleContext(this.document.uuid),
      ...buildInventoryContext(items, {
        technomancer: this.actor.system.technomancy?.technomancer,
      }),
    };
  }

  _getEffectsContext() {
    return buildEffectsContext(this.document.effects);
  }

  async _getMatrixContext(actorData) {
    return buildMatrixContext(actorData, this.document.uuid);
  }

  async _getMagicContext(actorData) {
    return buildMagicContext(
      actorData,
      this.document.uuid,
      this.actor.getEffectiveMagicSplit()
    );
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    const headerControls = frame.querySelector(
      '.window-header .header-control'
    );

    const html = await renderTemplate(TEMPLATES.ui.importUpdateButton, {});
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
      .querySelectorAll('select[data-mentor-choice]')
      .forEach((select) => {
        select.addEventListener(
          'change',
          async (event) => {
            const target = event.currentTarget;
            const itemId = target.closest('[data-item-id]')?.dataset.itemId;
            const set = target.dataset.set;
            const item = itemId ? this.actor.items.get(itemId) : undefined;
            if (!item || !set) return;
            await selectMentorChoice(item, set, target.value);
          },
          { signal }
        );
      });

    this.element.querySelectorAll('input[data-split]').forEach((input) => {
      input.addEventListener(
        'change',
        async (event) => {
          const target = event.currentTarget;
          await this.actor.setMagicSplit({
            [target.dataset.split]: Number(target.value),
          });
        },
        { signal }
      );
    });

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

    const skillSearchInput = this.element.querySelector('#skill-search');
    const skillFilterNoRatingBtn = this.element.querySelector(
      '#skill-filter-no-rating'
    );

    const applySkillFilters = () => {
      const query = (skillSearchInput?.value || '').toLowerCase().trim();
      const hideNoRating =
        skillFilterNoRatingBtn?.getAttribute('aria-pressed') === 'true';
      this.element.querySelectorAll('.skill').forEach((el) => {
        const name = (el.dataset.skillName || '').toLowerCase();
        const rating = Number(el.dataset.rating) || 0;
        const matchesSearch = query.length === 0 || name.includes(query);
        const matchesRating = !hideNoRating || rating > 0;
        el.classList.toggle('hidden', !(matchesSearch && matchesRating));
      });
    };

    skillSearchInput?.addEventListener('input', applySkillFilters, {
      signal,
    });
    skillFilterNoRatingBtn?.addEventListener(
      'click',
      () => {
        this.hideNoRatingSkills = !this.hideNoRatingSkills;
        skillFilterNoRatingBtn.setAttribute(
          'aria-pressed',
          String(this.hideNoRatingSkills)
        );
        applySkillFilters();
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

  static async #onTogglePowerSuppressed(_event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;
    const power = this.actor.items.get(itemId);
    if (!power) return;
    await setPowerSuppressed(power, !power.system.suppressed);
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

  static async #onMatrixAttack() {
    await CybercombatFlow.start(this.actor);
  }

  static async #onMatrixJackOut() {
    await CybercombatFlow.jackOut(this.actor);
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

  static async #onDecompileSprite() {
    await DismissalFlow.start(this.actor, 'sprite');
  }

  static async #onBanishSpirit() {
    await DismissalFlow.start(this.actor, 'spirit');
  }

  static async #onBindSpirit() {
    await BindingFlow.startTargeted(this.actor, 'spirit');
  }

  static async #onBindSprite() {
    await BindingFlow.startTargeted(this.actor, 'sprite');
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

  static async #onCreateMentor(event, target) {
    const category = target.dataset.category || 'Other';
    const [item] = await this.actor.createEmbeddedDocuments('Item', [
      {
        name: game.i18n.localize('TYPES.Item.Mentor'),
        type: 'Mentor',
        system: { category },
      },
    ]);
    item?.sheet?.render(true);
  }
}
