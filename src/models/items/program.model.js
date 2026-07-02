import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4ProgramSystem
 * @property {string} category
 * @property {boolean} complexform
 * @property {number|null} maxrating
 * @property {object[]} programtypes
 * @property {boolean} threaded
 */

export class SR4ProgramData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      category: new fields.StringField({ initial: '' }),
      complexform: new fields.BooleanField({ initial: false }),
      maxrating: new fields.NumberField({
        initial: null,
        nullable: true,
        integer: true,
      }),
      programtypes: new fields.ArrayField(new fields.ObjectField()),
      threaded: new fields.BooleanField({ initial: false }),
    };
  }
}
