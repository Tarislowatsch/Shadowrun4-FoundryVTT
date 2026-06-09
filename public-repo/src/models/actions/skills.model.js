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
      category: new fields.StringField({ initial: 'misc' }),
    };
  }
}

export const ActiveSkillCategories = Object.freeze({
  /** @type {string} Localisation key for the Magic skill category. */
  MAGIC: 'sr4.skills.categories.magic',

  /** @type {string} Localisation key for the Matrix skill category. */
  MATRIX: 'sr4.skills.categories.matrix',

  /** @type {string} Localisation key for the Miscellaneous skill category. */
  MISC: 'sr4.skills.categories.misc',

  /** @type {string} Localisation key for the Physical skill category. */
  PHYSICAL: 'sr4.skills.categories.physical',

  /** @type {string} Localisation key for the Resonance skill category. */
  RESONANCE: 'sr4.skills.categories.resonance',

  /** @type {string} Localisation key for the Social skill category. */
  SOCIAL: 'sr4.skills.categories.social',

  /** @type {string} Localisation key for the Technical skill category. */
  TECHNICAL: 'sr4.skills.categories.technical',

  /** @type {string} Localisation key for the Vehicle skill category. */
  VEHICLE: 'sr4.skills.categories.vehicle',
});

export const KnowledgeSkillCategories = Object.freeze({
  /** @type {string} Localisation key for the Academic knowledge skill category. */
  ACADEMIC: 'sr4.skills.categories.academic',

  /** @type {string} Localisation key for the Hobby knowledge skill category. */
  HOBBY: 'sr4.skills.categories.hobby',

  /** @type {string} Localisation key for the Language skill category. */
  LANGUAGE: 'sr4.skills.categories.language',

  /** @type {string} Localisation key for the Miscellaneous knowledge skill category. */
  MISC: 'sr4.skills.categories.misc',

  /** @type {string} Localisation key for the Street knowledge skill category. */
  STREET: 'sr4.skills.categories.street',
});
