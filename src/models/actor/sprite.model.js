const fields = foundry.data.fields;
import { summonedEntityFields } from '@models/shared';

export class SR4SpriteData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rating: new fields.NumberField({ initial: 3, integer: true }),
      spriteType: new fields.StringField({ initial: '', blank: true }),
      tasks: new fields.NumberField({ initial: 0, integer: true }),
      ...summonedEntityFields(),
    };
  }
}
