const fields = foundry.data.fields;

export class SR4VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: '' }),
      cost: new fields.NumberField({ initial: 0, integer: true }),
      availability: new fields.StringField({ initial: '' }),
      legality: new fields.StringField({ initial: '' }),
      body: new fields.NumberField({ initial: 0, integer: true }),
      speed: new fields.NumberField({ initial: 0, integer: true }),
      acceleration: new fields.NumberField({ initial: 0, integer: true }),
      pilot: new fields.NumberField({ initial: 0, integer: true }),
      sensor: new fields.NumberField({ initial: 0, integer: true }),
      seats: new fields.NumberField({ initial: 0, integer: true }),
      initiative: new fields.NumberField({ initial: 0, integer: true }),
      handling: new fields.NumberField({ initial: 0, integer: true }),
      armor: new fields.NumberField({ initial: 0, integer: true }),
      mods: new fields.ArrayField(new fields.ObjectField()),
      weapons: new fields.ArrayField(new fields.ObjectField()),
      owner: new fields.StringField({ initial: '' }),
    };
  }
}
