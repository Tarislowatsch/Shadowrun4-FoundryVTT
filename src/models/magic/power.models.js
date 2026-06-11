import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4Power
 * @property {boolean}  hasRating    - Whether this power uses a rating at all
 * @property {number}   rating       - Power level (integer, minimum 1)
 * @property {number}   cost         - Power point cost per rating (decimal, e.g. 0.5)
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
      hasRating: new fields.BooleanField({ initial: false }),
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
