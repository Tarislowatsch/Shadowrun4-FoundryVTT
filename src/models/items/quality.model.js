import { descriptionFields } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4QualitySystem
 * @property {string} description
 * @property {string} notes
 * @property {'Positive'|'Negative'} category
 * @property {number} bp
 * @property {number|null} limit
 * @property {string} source
 */

export class SR4QualityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...descriptionFields(),
      category: new fields.StringField({
        initial: 'Positive',
        choices: ['Positive', 'Negative'],
        blank: false,
      }),
      bp: new fields.NumberField({ initial: 0, integer: true }),
      limit: new fields.NumberField({
        initial: null,
        nullable: true,
        integer: true,
      }),
    };
  }
}
