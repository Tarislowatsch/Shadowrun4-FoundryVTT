import { SpellcastingFlow } from '@flows/index';
import { Attackskill } from '@models/index';
import { getGame } from '@utils/index';
import { resolveRiggerSync } from '@utils/rigging/drone-pool.js';
import { SR4ActiveEffect } from '@effects/index';

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
   * @param {string} skillName
   * @returns {import('@models/index').SR4Skill | null}
   */
  getSkill(skillName) {
    /** @type {any} */
    const self = this;
    return (
      self.items.find(
        (item) =>
          item.type === 'Skill' &&
          item.name.toLowerCase() === skillName.toLowerCase()
      ) ?? null
    );
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
   * @param {import('@models/index').SR4Skill} skill
   * @returns {string|undefined}
   */
  getSkillTranslatedLabelOrName(skill) {
    return skill.system.label
      ? getGame().i18n?.localize(skill.system.label)
      : skill.name;
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

    const critterTemplates = data.filter((d) => d.type === 'CritterTemplate');
    if (critterTemplates.length > 0) {
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].type === 'CritterTemplate') data.splice(i, 1);
      }
      const tpl = critterTemplates[0];
      const { CritterCreationDialog } = await import(
        '@sheets/importer/critter-creation-dialog.js'
      );
      CritterCreationDialog.createFromTemplate(tpl.system, tpl.name);
    }

    const hasMetatype = this.items.some((i) => i.type === 'Metatype');
    const incomingMetatypes = data.filter((d) => d.type === 'Metatype');
    if (hasMetatype && incomingMetatypes.length > 0) {
      ui.notifications?.warn(game.i18n.localize('sr4.metatype.onlyOneAllowed'));
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].type === 'Metatype') data.splice(i, 1);
      }
    } else if (incomingMetatypes.length > 1) {
      ui.notifications?.warn(game.i18n.localize('sr4.metatype.onlyOneAllowed'));
      const firstIdx = data.findIndex((d) => d.type === 'Metatype');
      for (let i = data.length - 1; i > firstIdx; i--) {
        if (data[i].type === 'Metatype') data.splice(i, 1);
      }
    }
  }

  async _preUpdate(changed, options, userId) {
    await super._preUpdate(changed, options, userId);
    if (game.settings.get('shadowrun4e', 'liveInitiativeReduction'))
      options._sr4Malus = this.getMalus();
  }

  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (!game.settings.get('shadowrun4e', 'liveInitiativeReduction')) return;

    const oldMalus = options._sr4Malus;
    if (oldMalus === undefined) return;

    const delta = this.getMalus() - oldMalus;
    if (delta === 0) return;

    /** @type {any} */
    const self = this;
    for (const combat of game?.combats ?? []) {
      // @ts-ignore — combatants is the correct Foundry EmbeddedCollection property
      const combatant = combat.combatants.find((c) => c.actor?.id === self.id);
      if (!combatant || combatant.initiative === null) continue;
      await combatant.update({
        initiative: Math.max(0, combatant.initiative + delta),
      });
    }
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
      await SR4Actor.#addSkillsFromCompendium(self, self.type === 'npc');
    }
  }

  static async #addSkillsFromCompendium(actor, npcOnly) {
    if (actor.items.some((i) => i.type === 'Skill')) return;
    const skillData = await SR4Actor.buildCompendiumSkillData(npcOnly);
    if (skillData.length > 0)
      await actor.createEmbeddedDocuments('Item', skillData);
  }

  /**
   * @param {boolean} [npcOnly=false]
   * @returns {Promise<Array<{ name: string, type: string, img: string|null, system: object, effects: [] }>>}
   */
  static async buildCompendiumSkillData(npcOnly = false) {
    const compendium = game?.packs?.get('shadowrun4e.skills');
    if (!compendium) {
      ui.notifications?.error(
        'SR4 | Skill compendium "shadowrun4e.skills" not found.'
      );
      return [];
    }
    const index = await compendium.getIndex();
    let skillEntries = index.filter((e) => e?.type === 'Skill');
    if (npcOnly) {
      const allowlist = new Set(
        JSON.parse(game.settings.get('shadowrun4e', 'npcDefaultSkills'))
      );
      skillEntries = skillEntries.filter((e) =>
        allowlist.has(e.name?.toLowerCase())
      );
    }
    const skills = await Promise.all(
      skillEntries.map((e) => compendium.getDocument(e._id))
    );
    return skills
      .filter(Boolean)
      .map((s) => {
        const obj = s.toObject();
        return {
          name: obj.name ?? s.name,
          type: obj.type ?? s.type,
          img: obj.img ?? null,
          system: obj.system ?? {},
          effects: [],
        };
      })
      .filter((s) => s.name && s.type);
  }

  /**
   * @param {'physical'|'stun'} track
   * @param {number} amount
   */
  async dealMonitorDamage(track, amount) {
    const monitor = this.system.conditionMonitor?.[track];
    if (!monitor) return;
    const clamped = Math.clamp(monitor.value + amount, 0, monitor.max);
    await this.update({ [`system.conditionMonitor.${track}.value`]: clamped });
  }

  /** @param {'physical'|'stun'} track */
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
