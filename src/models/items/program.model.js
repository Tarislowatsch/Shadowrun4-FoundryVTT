import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4ProgramSystem
 * @property {string} category      - Program category (e.g. 'Common Use', 'Hacking').
 * @property {boolean} complexform  - True when the entry is a technomancer complex form.
 * @property {number|null} maxrating - Maximum rating, or null when unbounded.
 * @property {object[]} programtypes - Optional sub-type tags.
 * @property {boolean} threaded     - True while a complex form is currently threaded/sustained.
 */

/** DataModel for programs (type: "Program"). */
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
