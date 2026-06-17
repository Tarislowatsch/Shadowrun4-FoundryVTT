import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {'none'|'rated'|'ratedNoCost'} SR4PowerRatingMode
 *
 * @typedef {object} SR4Power
 * @property {SR4PowerRatingMode} ratingMode  - How rating affects PP cost
 * @property {number}   rating       - Power level (integer, minimum 1)
 * @property {number}   cost         - PP cost (flat, or per level when ratingMode='rated')
 * @property {boolean}  geas         - Whether the power requires a geas
 * @property {string}   description  - Full description of the power
 * @property {string}   notes        - GM/player notes
 * @property {string}   source       - Rulebook source (e.g. "SR4 Core p. 172")
 * @property {string[]} affects      - List of affected attributes/stats for future effect processing
 */

/**
 * DataModel for Adept Powers (type: "Power").
 */
export class SR4PowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ratingMode: new fields.StringField({
        initial: 'none',
        blank: false,
        choices: ['none', 'rated', 'ratedNoCost'],
      }),
      rating: new fields.NumberField({
        initial: 1,
        integer: true,
        min: 1,
        nullable: false,
      }),
      cost: new fields.NumberField({ initial: 0.5, min: 0, nullable: false }),
      geas: new fields.BooleanField({ initial: false }),
      description: new fields.StringField({ initial: '', blank: true }),
      notes: new fields.StringField({ initial: '', blank: true }),
      source: new fields.StringField({ initial: '', blank: true }),
      affects: new fields.ArrayField(new fields.StringField({ blank: false }), {
        initial: [],
      }),
    };
  }

  get totalCost() {
    const self = /** @type {SR4Power} */ (/** @type {unknown} */ (this));
    return self.ratingMode === 'rated' ? self.cost * self.rating : self.cost;
  }
}

/**
 * @typedef {object} SR4CritterPower
 * @property {string} description - HTML content
 * @property {string} notes
 * @property {string} source
 */

/**
 * DataModel for Critter / Spirit Powers (type: "CritterPower").
 */
export class SR4CritterPowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: '' }),
      notes: new fields.StringField({ initial: '', blank: true }),
      source: new fields.StringField({ initial: '', blank: true }),
    };
  }
}
