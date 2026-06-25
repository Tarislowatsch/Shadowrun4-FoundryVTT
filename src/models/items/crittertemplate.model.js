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
      description: new fields.HTMLField({ initial: '' }),
      category: new fields.StringField({ initial: '' }),
      forceBased: new fields.BooleanField({ initial: false }),
      actorType: new fields.StringField({ initial: 'npc' }),
      bp: new fields.NumberField({ initial: 0, integer: true }),
      baseTemplate: new fields.StringField({ initial: '' }),
      attributes: new fields.SchemaField({
        body: critterAttributeField(),
        agility: critterAttributeField(),
        reaction: critterAttributeField(),
        strength: critterAttributeField(),
        charisma: critterAttributeField(),
        intuition: critterAttributeField(),
        logic: critterAttributeField(),
        willpower: critterAttributeField(),
        initiative: critterAttributeField(),
        edge: critterAttributeField(),
        magic: critterAttributeField(),
        resonance: critterAttributeField(),
        essence: critterAttributeField(),
      }),
      movement: new fields.StringField({ initial: '' }),
      qualities: new fields.SchemaField({
        positive: new fields.ArrayField(new fields.StringField()),
        negative: new fields.ArrayField(new fields.StringField()),
      }),
      reach: new fields.NumberField({ initial: 0, integer: true }),
      armorBallistic: new fields.NumberField({ initial: 0, integer: true }),
      armorImpact: new fields.NumberField({ initial: 0, integer: true }),
      powers: new fields.ArrayField(new fields.StringField()),
      optionalPowers: new fields.ArrayField(new fields.StringField()),
      complexForms: new fields.ArrayField(new fields.StringField()),
      optionalComplexForms: new fields.ArrayField(new fields.StringField()),
      skills: new fields.ArrayField(skillEntryField()),
      source: new fields.StringField({ initial: '' }),
    };
  }
}
