import { SpellcastingFlow } from '@flows/index';
import { Attackskill } from '@models/index';
import { computeDerivedStats } from './derivedStats.mapper';
import { getGame } from '@utils/index';
import { SR4ActiveEffect } from '@effects/index';

/**
 * @typedef {Object} SR4Actor
 * @property {import('@models/index').SR4BaseCharacterSystem} system
 * @property {import('@models/index').SR4SheetStats} sheetStats
 * @property {import('@models/index').SR4SheetStats} finalStats
 * @property {string} name
 * @property {any} items
 * @property {string} id
 * @property {() => void} prepareData
 * @property {() => void} applyActiveEffects
 * @property {() => void} prepareBaseData
 * @property {() => void} prepareDerivedData
 * @property {() => Promise<void>} useEdge
 * @property {(newEdge?: number) => Promise<void>} resetEdge
 * @property {(attribute: keyof import('@models/index').SR4SheetStats) => number} getAttribute
 * @property {(skillName: string) => import('@models/index').SR4Skill | null} getSkill
 * @property {(skillKey: string) => import('@models/index').SR4Skill | undefined} findByAttackSkill
 * @property {(skill: import('@models/index').SR4Skill) => string | undefined} getSkillTranslatedLabelOrName
 * @property {() => Promise<void>} updateTokenAppearance
 */
export class SR4Actor extends foundry.documents.Actor {
  get actor() {
    return this;
  }

  prepareDerivedData() {
    // @ts-ignore
    const systemData = this.system;
    if (!systemData?.sheetStats) return;

    // @ts-ignore
    const equipped = this.items.filter(
      (i) => i.type === 'Armor' && i.system?.equipped === true
    );
    // Effects are applied before prepareDerivedData; preserve their contribution
    const armorBonus = {
      ballistic: systemData.armor.ballistic,
      impact: systemData.armor.impact,
    };
    systemData.armor.ballistic =
      equipped.reduce((s, i) => s + (i.system.ballisticarmor || 0), 0) +
      armorBonus.ballistic;
    systemData.armor.impact =
      equipped.reduce((s, i) => s + (i.system.impactarmor || 0), 0) +
      armorBonus.impact;

    const derived = computeDerivedStats(systemData);
    Object.assign(systemData.derivedStats, derived);
  }

  /** @returns {import('@models/index').SR4SheetStats} */
  get sheetStats() {
    // @ts-ignore
    return this.system.sheetStats;
  }

  /** @returns {import('@models/index').SR4SheetStats} */
  get finalStats() {
    // @ts-ignore
    return this.system.sheetStats;
  }

  /** @returns {number} */
  get dicePoolModifier() {
    // @ts-ignore
    return this.system.derivedStats.dicePoolModifier ?? 0;
  }

  /**
   * @param {keyof import('@models/index').SR4SheetStats} attribute
   * @returns {number}
   */
  getAttribute(attribute) {
    return this.finalStats[attribute] ?? 0;
  }

  async useEdge() {
    if (this.sheetStats.CURRENTEDGE > 0) {
      // @ts-ignore
      await this.update({
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
    // @ts-ignore
    await this.update({
      system: { sheetStats: { CURRENTEDGE: newEdge ?? this.sheetStats.EDGE } },
    });
  }

  /**
   * @param {string} skillName
   * @returns {import('@models/index').SR4Skill}
   */
  getSkill(skillName) {
    return (
      // @ts-ignore
      this.items.find(
        (item) =>
          item.type === 'Skill' &&
          item.name.toLowerCase() === skillName.toLowerCase()
      ) ?? null
    );
  }

  /**
   * @param {string} skillKey
   * @returns {import('@models/index').SR4Skill}
   */
  findByAttackSkill(skillKey) {
    const label = Attackskill[skillKey];
    // @ts-ignore
    return this.items.find(
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
    return SR4ActiveEffect.fromTemplate(templateKey, this);
  }

  async updateTokenAppearance() {
    // @ts-ignore
    if (!this.token) return;
    const newEffects = [];
    // @ts-ignore
    if (this.system.conditionMonitor.stun.current > 0) {
      newEffects.push('icons/svg/wounded.svg');
    }
    // @ts-ignore
    await this.token.update({ effects: newEffects });
  }
}
