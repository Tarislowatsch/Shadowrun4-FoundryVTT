const fields = foundry.data.fields;

const attributeLimitField = (min = 1, max = 6, aug = 9) =>
  new fields.SchemaField({
    min: new fields.NumberField({ initial: min, integer: true }),
    max: new fields.NumberField({ initial: max, integer: true }),
    aug: new fields.NumberField({ initial: aug, integer: true }),
  });

export class SR4MetatypeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: '' }),
      category: new fields.StringField({ initial: 'Metahuman' }),
      bp: new fields.NumberField({ initial: 0, integer: true }),
      baseMetatype: new fields.StringField({ initial: '' }),
      attributes: new fields.SchemaField({
        body: attributeLimitField(1, 6, 9),
        agility: attributeLimitField(1, 6, 9),
        reaction: attributeLimitField(1, 6, 9),
        strength: attributeLimitField(1, 6, 9),
        charisma: attributeLimitField(1, 6, 9),
        intuition: attributeLimitField(1, 6, 9),
        logic: attributeLimitField(1, 6, 9),
        willpower: attributeLimitField(1, 6, 9),
        initiative: attributeLimitField(2, 12, 18),
        edge: attributeLimitField(2, 7, 7),
        magic: attributeLimitField(1, 6, 6),
        resonance: attributeLimitField(1, 6, 6),
        essence: attributeLimitField(0, 6, 6),
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
      source: new fields.StringField({ initial: '' }),
    };
  }
}
