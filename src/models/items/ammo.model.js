import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4AmmoSystem
 * @property {number} damageBonus
 * @property {number} apBonus
 * @property {string} damageTypeOverride
 * @property {number|null} damageOverride
 * @property {number} quantity
 */

export class SR4AmmoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      damageBonus: new fields.NumberField({ initial: 0, integer: true }),
      apBonus: new fields.NumberField({ initial: 0, integer: true }),
      damageTypeOverride: new fields.StringField({ initial: '', blank: true }),
      category: new fields.StringField({ initial: '', blank: true }),
      damageOverride: new fields.NumberField({
        initial: null,
        nullable: true,
        integer: true,
      }),
    };
  }
}
