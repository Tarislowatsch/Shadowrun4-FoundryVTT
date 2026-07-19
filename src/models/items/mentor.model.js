import { descriptionFields } from '@models/shared';

const fields = foundry.data.fields;

/** @type {readonly string[]} */
export const MENTOR_CATEGORIES = Object.freeze([
  'Animal',
  'Other',
  'Toxic',
  'Resonance',
  'Disonance',
]);

/**
 * @param {string} category
 * @returns {boolean}
 */
export function isParagonCategory(category) {
  return category === 'Resonance' || category === 'Disonance';
}

/** @type {Readonly<Record<string, string>>} */
export const MentorCategories = Object.freeze(
  Object.fromEntries(
    MENTOR_CATEGORIES.map((category) => [
      category,
      `sr4.mentor.categories.${category}`,
    ])
  )
);

/**
 * @typedef {object} SR4MentorChoice
 * @property {number} set
 * @property {string} name
 * @property {string} description
 * @property {boolean} hasBonus
 */
function mentorChoiceField() {
  return new fields.SchemaField({
    set: new fields.NumberField({ initial: 1, integer: true }),
    name: new fields.StringField({ initial: '' }),
    description: new fields.StringField({ initial: '', blank: true }),
    hasBonus: new fields.BooleanField({ initial: false }),
  });
}

/**
 * @typedef {object} SR4MentorSystem
 * @property {string} category
 * @property {string} advantage
 * @property {string} disadvantage
 * @property {SR4MentorChoice[]} choices
 * @property {Record<string, string>} selectedChoices - Map of choice `set` (as string) to the selected choice's name.
 */
export class SR4MentorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...descriptionFields(),
      category: new fields.StringField({
        initial: 'Other',
        choices: [...MENTOR_CATEGORIES],
        blank: false,
      }),
      advantage: new fields.StringField({ initial: '', blank: true }),
      disadvantage: new fields.StringField({ initial: '', blank: true }),
      choices: new fields.ArrayField(mentorChoiceField()),
      selectedChoices: new fields.ObjectField({ initial: {} }),
    };
  }

  /** @returns {boolean} */
  get isParagon() {
    return isParagonCategory(this.category);
  }
}
