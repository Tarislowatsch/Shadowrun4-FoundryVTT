import { evaluateForceFormula } from '@utils/force-formula.js';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4Skill
 * @property {string} name
 * @property {string} type
 * @property {SR4SkillSystem} system
 */

/**
 * @typedef {object} SR4SkillSystem
 * @property {string} description
 * @property {keyof import('@models/index').SR4SheetStats} attribute
 * @property {string} type
 * @property {string} group
 * @property {string} specialization
 * @property {string} source
 * @property {number} rating
 * @property {string} ratingFormula
 * @property {string} label
 * @property {string} category
 */
export class SR4SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ initial: '' }),
      attribute: new fields.StringField({ initial: '' }),
      type: new fields.StringField({ initial: 'active' }),
      group: new fields.StringField({ initial: '' }),
      specialization: new fields.StringField({ initial: '' }),
      source: new fields.StringField({ initial: '' }),
      label: new fields.StringField({ initial: '' }),
      rating: new fields.NumberField({ initial: 0, integer: true }),
      ratingFormula: new fields.StringField({ initial: '' }),
      category: new fields.StringField({ initial: 'misc' }),
    };
  }

  prepareDerivedData() {
    if (!this.ratingFormula) return;
    const actor = this.parent?.actor;
    if (!actor) return;
    const force =
      actor.type === 'spirit'
        ? actor.system.force
        : actor.type === 'sprite'
          ? actor.system.rating
          : null;
    if (force === null || force === undefined) return;
    this.rating = evaluateForceFormula(this.ratingFormula, force);
  }
}

export const ActiveSkillCategories = Object.freeze({
  /** @type {string} */
  MAGIC: 'sr4.skills.categories.magic',

  /** @type {string} */
  MATRIX: 'sr4.skills.categories.matrix',

  /** @type {string} */
  MISC: 'sr4.skills.categories.misc',

  /** @type {string} */
  PHYSICAL: 'sr4.skills.categories.physical',

  /** @type {string} */
  RESONANCE: 'sr4.skills.categories.resonance',

  /** @type {string} */
  SOCIAL: 'sr4.skills.categories.social',

  /** @type {string} */
  TECHNICAL: 'sr4.skills.categories.technical',

  /** @type {string} */
  VEHICLE: 'sr4.skills.categories.vehicle',
});

/**
 * @type {Readonly<Record<string, string>>}
 */
export const SR4SkillGroupKeys = Object.freeze({
  athletics: 'athletics',
  biotech: 'biotech',
  closeCombat: 'close combat',
  conjuring: 'conjuring',
  cracking: 'cracking',
  electronics: 'electronics',
  influence: 'influence',
  mechanic: 'mechanic',
  outdoors: 'outdoors',
  rangedCombat: 'ranged combat',
  sorcery: 'sorcery',
  stealth: 'stealth',
  tasking: 'tasking',
});

/** @type {Readonly<Record<string, string>>} */
export const SR4SkillGroupByName = Object.freeze(
  Object.fromEntries(Object.entries(SR4SkillGroupKeys).map(([k, v]) => [v, k]))
);

export const KnowledgeSkillCategories = Object.freeze({
  /** @type {string} */
  ACADEMIC: 'sr4.skills.categories.academic',

  /** @type {string} */
  HOBBY: 'sr4.skills.categories.hobby',

  /** @type {string} */
  LANGUAGE: 'sr4.skills.categories.language',

  /** @type {string} */
  MISC: 'sr4.skills.categories.misc',

  /** @type {string} */
  STREET: 'sr4.skills.categories.street',
});
