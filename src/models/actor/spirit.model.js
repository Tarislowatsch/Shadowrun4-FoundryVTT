const fields = foundry.data.fields;
import { summonedEntityFields } from '@models/shared';

export class SR4SpiritData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      force: new fields.NumberField({ initial: 3, integer: true }),
      spiritType: new fields.StringField({ initial: '', blank: true }),
      services: new fields.NumberField({ initial: 0, integer: true }),
      ...summonedEntityFields(),
    };
  }
}
