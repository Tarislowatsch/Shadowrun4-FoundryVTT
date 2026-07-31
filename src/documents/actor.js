import { SpellcastingFlow } from '@domains/magic/flow/spellcasting-flow.js';
import { Attackskill, findSkillIn } from '@models/index';
import {
  getBackgroundCountMagicModifier,
  getMysticAdeptReduction,
} from '@utils/index';
import { resolveRiggerSync } from '@domains/rigging/index.js';
import { SR4ActiveEffect } from '@effects/index';
import { resolveMagicSplit, applyMagicModifier } from '@domains/magic/split.js';
import {
  handleDescendantItemPreCreate,
  shouldBlockJammedMatrixUpdate,
  captureLiveInitiativeScores,
  applyLiveInitiativeUpdate,
} from './actor-lifecycle.js';
import {
  addSkillsFromCompendium,
  buildCompendiumSkillData as buildCompendiumSkillDataFromSeed,
} from './actor-skill-seed.js';

/** @type {import('@models/index').SR4SheetStats} */
const DEFAULT_STATS = {
  BODY: 0,
  AGILITY: 0,
  REACTION: 0,
  STRENGTH: 0,
  CHARISMA: 0,
  INTUITION: 0,
  LOGIC: 0,
  WILLPOWER: 0,
  MAGIC: 0,
  RESONANCE: 0,
  EDGE: 0,
  CURRENTEDGE: 0,
  ESSENCE: 0,
  INITIATIVE: 0,
  ASTRALINITIATIVE: 0,
  MATRIXINITIATIVE: 0,
};

/**
 * @typedef {'character' | 'npc' | 'vehicle' | 'spirit' | 'sprite'} SR4ActorType
 */

/**
 * @interface SR4Actor
 * @property {string | null} id
 * @property {string} name
 * @property {SR4ActorType} type
 * @property {import('@models/index').SR4BaseCharacterSystem | import('@models/index').SR4VehicleSystem | import('@models/index').SR4SpiritSystem} system
 * @property {foundry.utils.Collection<foundry.documents.Item>} items
 */
export class SR4Actor extends foundry.documents.Actor {
  get actor() {
    return this;
  }

  /** @returns {import('@models/index').SR4SheetStats} */
  get sheetStats() {
    /** @type {any} */
    const self = this;
    /** @type {import('@models/index').SR4BaseCharacterSystem} */
    const sys = self.system;
    return sys.sheetStats ?? DEFAULT_STATS;
  }

  /** @returns {number} */
  get dicePoolModifier() {
    /** @type {any} */
    const self = this;
    /** @type {import('@models/index').SR4BaseCharacterSystem} */
    const sys = self.system;
    return sys.derivedStats?.dicePoolModifier ?? 0;
  }

  /**
   * @param {keyof import('@models/index').SR4SheetStats} attribute
   * @returns {number}
   */
  getAttribute(attribute) {
    return this.sheetStats[attribute] ?? 0;
  }

  /** @returns {string} */
  getMagicTradition() {
    /** @type {any} */
    const self = this;
    return self.system?.magic?.tradition ?? '';
  }

  /** @returns {number} */
  getSpellpower() {
    /** @type {any} */
    const self = this;
    return (
      self.system?.derivedStats?.spellpower ?? this.getAttribute('MAGIC') ?? 0
    );
  }

  /** @returns {number} */
  getPowerPoints() {
    /** @type {any} */
    const self = this;
    const derived = self.system?.derivedStats?.powerPoints;
    if (derived !== undefined) return derived;
    if (!self.system?.magic) return 0;
    return resolveMagicSplit(self.system.magic, this.getAttribute('MAGIC'))
      .powerPoints;
  }

  /**
   * @param {{ spellpower?: number, powerPoints?: number }} split
   * @returns {Promise<void>}
   */
  async setMagicSplit(split) {
    /** @type {any} */
    const self = this;
    const magic = { ...(self.system?.magic ?? {}), ...split };
    const { spellpower, powerPoints } = resolveMagicSplit(
      magic,
      this.getAttribute('MAGIC')
    );
    await self.update({ system: { magic: { spellpower, powerPoints } } });
  }

  /**
   * @param {object} [scene]
   * @returns {{ spellpower: number, powerPoints: number }}
   */
  getEffectiveMagicSplit(scene = canvas?.scene) {
    // Modifier is signed: a positive Background Count is subtracted (malus),
    // while an aspected-match returns a negative value that raises Magic (bonus).
    const modifier = getBackgroundCountMagicModifier(
      scene,
      this.getMagicTradition()
    );
    return applyMagicModifier(
      { spellpower: this.getSpellpower(), powerPoints: this.getPowerPoints() },
      modifier,
      getMysticAdeptReduction(scene)
    );
  }

  /**
   * @param {object} [scene]
   * @returns {number}
   */
  getEffectiveMagic(scene = canvas?.scene) {
    return this.getEffectiveMagicSplit(scene).spellpower;
  }

  /**
   * @param {object} [scene]
   * @returns {number}
   */
  getEffectivePowerPoints(scene = canvas?.scene) {
    return this.getEffectiveMagicSplit(scene).powerPoints;
  }

  async useEdge() {
    if (this.sheetStats.CURRENTEDGE > 0) {
      /** @type {any} */
      const self = this;
      await self.update({
        system: {
          sheetStats: { CURRENTEDGE: this.sheetStats.CURRENTEDGE - 1 },
        },
      });
    }
  }

  /**
   * @param {number} [newEdge]
   */
  async resetEdge(newEdge) {
    /** @type {any} */
    const self = this;
    await self.update({
      system: { sheetStats: { CURRENTEDGE: newEdge ?? this.sheetStats.EDGE } },
    });
  }

  /**
   * @param {string} skillRef
   * @returns {import('@models/index').SR4Skill | null}
   */
  getSkill(skillRef) {
    /** @type {any} */
    const self = this;
    return findSkillIn(self.items, skillRef);
  }

  /**
   * @param {string} skillKey
   * @returns {import('@models/index').SR4Skill | undefined}
   */
  findByAttackSkill(skillKey) {
    const label = Attackskill[skillKey];
    if (!label) return undefined;
    /** @type {any} */
    const self = this;
    return self.items.find(
      (item) => item.type === 'Skill' && item.system.label === label
    );
  }

  /**
   * @param {string} spellId
   * @returns {Promise<void>}
   */
  async castSpell(spellId) {
    const spell = this.items.get(spellId);
    if (!spell) return;
    await SpellcastingFlow.start(this, spell);
  }

  /**
   * Toggles the disabled state of an ActiveEffect.
   * @param {string} effectId
   * @returns {Promise<SR4ActiveEffect|undefined>}
   */
  async toggleEffect(effectId) {
    const effect = this.effects.get(effectId);
    if (!effect) return;
    return effect.update({ disabled: !effect.disabled });
  }

  /**
   * Creates a new ActiveEffect on this actor from a named template.
   * Multiple calls stack independently (e.g. one per sustained spell).
   * @param {string} templateKey - Key into EFFECT_TEMPLATES (e.g. 'sustain')
   * @returns {Promise<SR4ActiveEffect>}
   */
  async applyEffectTemplate(templateKey) {
    // @ts-ignore — SR4Actor satisfies the Actor contract at runtime
    return SR4ActiveEffect.fromTemplate(templateKey, this);
  }

  /** @returns {number} */
  getInitiativeBase() {
    /** @type {any} */
    const self = this;
    if (self.type === 'vehicle' && self.system?.controlMode !== 'autonomous') {
      const rigger = resolveRiggerSync(self);
      if (rigger) return rigger.getInitiativeBase();
    }
    return self.system?.derivedStats?.initiative?.physical ?? 0;
  }

  /** @returns {number} */
  getMalus() {
    /** @type {any} */
    const self = this;
    return self.system?.derivedStats?.woundModifier ?? 0;
  }

  /** @override */
  async _preCreateDescendantDocuments(
    parent,
    collection,
    data,
    options,
    userId
  ) {
    await super._preCreateDescendantDocuments(
      parent,
      collection,
      data,
      options,
      userId
    );
    if (collection !== 'items') return;
    await handleDescendantItemPreCreate(this, data);
  }

  async _preUpdate(changed, options, userId) {
    if (shouldBlockJammedMatrixUpdate(this, changed)) return false;
    await super._preUpdate(changed, options, userId);
    if (game.settings.get('shadowrun4e', 'liveInitiativeReduction'))
      options._sr4IniScores = captureLiveInitiativeScores(this);
  }

  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (!game.settings.get('shadowrun4e', 'liveInitiativeReduction')) return;
    await applyLiveInitiativeUpdate(this, options._sr4IniScores);
  }

  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (userId !== game.user?.id) return;

    /** @type {any} */
    const self = this;
    const updates = {};
    if (self.type === 'character') {
      updates['prototypeToken.actorLink'] = true;
    }
    if (game.settings.get('shadowrun4e', 'defaultTokenVision')) {
      updates['prototypeToken.sight.enabled'] = true;
      updates['prototypeToken.sight.range'] = game.settings.get(
        'shadowrun4e',
        'defaultTokenVisionRange'
      );
    }
    if (Object.keys(updates).length > 0) {
      await self.update(updates);
    }
    if (self.type === 'character' || self.type === 'npc') {
      await addSkillsFromCompendium(self, self.type === 'npc');
    }
  }

  /**
   * @param {boolean} [npcOnly=false]
   * @returns {Promise<Array<{ name: string, type: string, img: string|null, system: object, effects: [] }>>}
   */
  static async buildCompendiumSkillData(npcOnly = false) {
    return buildCompendiumSkillDataFromSeed(npcOnly);
  }

  /**
   * @param {'physical'|'stun'|'matrix'} track
   * @param {number} amount
   */
  async dealMonitorDamage(track, amount) {
    const monitor = this.system.conditionMonitor?.[track];
    if (!monitor) return;
    const clamped = Math.clamp(monitor.value + amount, 0, monitor.max);
    await this.update({ [`system.conditionMonitor.${track}.value`]: clamped });
  }

  /** @param {'physical'|'stun'|'matrix'} track */
  async resetMonitor(track) {
    /** @type {any} */
    const self = this;
    if (!self.system.conditionMonitor?.[track]) return;
    await self.update({ [`system.conditionMonitor.${track}.value`]: 0 });
  }

  async updateTokenAppearance() {
    /** @type {any} */
    const self = this;
    if (self.type !== 'character' && self.type !== 'npc') return;
    const token = self.token;
    if (!token) return;
    const newEffects = [];
    /** @type {import('@models/index').SR4BaseCharacterSystem} */
    const sys = self.system;
    if (sys.conditionMonitor.stun.value > 0) {
      newEffects.push('icons/svg/wounded.svg');
    }
    await token.update({ effects: newEffects });
  }
}
