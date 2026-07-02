import {
  descriptionFields,
  qualitiesField,
  attributeBlockField,
} from '@models/shared';

const fields = foundry.data.fields;

const critterAttributeField = () =>
  new fields.SchemaField({
    value: new fields.NumberField({ initial: 0, integer: true }),
    formula: new fields.StringField({ initial: '' }),
  });

const skillEntryField = () =>
  new fields.SchemaField({
    name: new fields.StringField({ initial: '' }),
    rating: new fields.NumberField({ initial: 0, integer: true }),
    ratingFormula: new fields.StringField({ initial: '' }),
    spec: new fields.StringField({ initial: '' }),
  });

export class SR4CritterTemplateData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...descriptionFields({ notes: false }),
      category: new fields.StringField({ initial: '' }),
      forceBased: new fields.BooleanField({ initial: false }),
      actorType: new fields.StringField({ initial: 'npc' }),
      bp: new fields.NumberField({ initial: 0, integer: true }),
      baseTemplate: new fields.StringField({ initial: '' }),
      attributes: attributeBlockField(critterAttributeField),
      movement: new fields.StringField({ initial: '' }),
      qualities: qualitiesField(),
      reach: new fields.NumberField({ initial: 0, integer: true }),
      armorBallistic: new fields.NumberField({ initial: 0, integer: true }),
      armorImpact: new fields.NumberField({ initial: 0, integer: true }),
      powers: new fields.ArrayField(new fields.StringField()),
      optionalPowers: new fields.ArrayField(new fields.StringField()),
      complexForms: new fields.ArrayField(new fields.StringField()),
      optionalComplexForms: new fields.ArrayField(new fields.StringField()),
      skills: new fields.ArrayField(skillEntryField()),
    };
  }
}
