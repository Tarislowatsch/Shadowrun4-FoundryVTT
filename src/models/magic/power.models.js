import { genericItemSchema, descriptionFields } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {'none'|'rated'|'ratedNoCost'} SR4PowerRatingMode
 *
 * @typedef {object} SR4Power
 * @property {SR4PowerRatingMode} ratingMode
 * @property {number}   rating
 * @property {number}   cost
 * @property {boolean}  geas
 * @property {boolean}  suppressed
 * @property {string}   description
 * @property {string}   notes
 * @property {string}   source
 * @property {string[]} affects
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
      suppressed: new fields.BooleanField({ initial: false }),
      ...descriptionFields({ description: 'string' }),
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
 * Power Points a power actually ties up. Works on live models and on the plain
 * item data the sheets hand around, where the totalCost getter is not carried
 * over.
 * @param {Partial<SR4Power> & { totalCost?: number }} [system]
 * @returns {number}
 */
export function powerPointCost(system) {
  if (!system || system.suppressed === true) return 0;
  if (typeof system.totalCost === 'number') return system.totalCost;
  const cost = system.cost ?? 0;
  return system.ratingMode === 'rated' ? cost * (system.rating ?? 1) : cost;
}

/**
 * @typedef {object} SR4CritterPower
 * @property {string} description
 * @property {string} notes
 * @property {string} source
 */

export class SR4CritterPowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return descriptionFields();
  }
}
