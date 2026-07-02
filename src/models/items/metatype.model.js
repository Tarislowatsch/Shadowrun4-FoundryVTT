import {
  descriptionFields,
  qualitiesField,
  attributeBlockField,
} from '@models/shared';

const fields = foundry.data.fields;

const attributeLimitField = (min = 1, max = 6, aug = 9) =>
  new fields.SchemaField({
    min: new fields.NumberField({ initial: min, integer: true }),
    max: new fields.NumberField({ initial: max, integer: true }),
    aug: new fields.NumberField({ initial: aug, integer: true }),
  });

/** @type {Record<string, [number, number, number]>} */
const ATTRIBUTE_LIMIT_OVERRIDES = {
  initiative: [2, 12, 18],
  edge: [2, 7, 7],
  magic: [1, 6, 6],
  resonance: [1, 6, 6],
  essence: [0, 6, 6],
};

export class SR4MetatypeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...descriptionFields({ notes: false }),
      category: new fields.StringField({ initial: 'Metahuman' }),
      bp: new fields.NumberField({ initial: 0, integer: true }),
      baseMetatype: new fields.StringField({ initial: '' }),
      attributes: attributeBlockField((key) =>
        attributeLimitField(...(ATTRIBUTE_LIMIT_OVERRIDES[key] ?? [1, 6, 9]))
      ),
      movement: new fields.StringField({ initial: '' }),
      qualities: qualitiesField(),
      reach: new fields.NumberField({ initial: 0, integer: true }),
      armorBallistic: new fields.NumberField({ initial: 0, integer: true }),
      armorImpact: new fields.NumberField({ initial: 0, integer: true }),
      powers: new fields.ArrayField(new fields.StringField()),
      optionalPowers: new fields.ArrayField(new fields.StringField()),
    };
  }
}
