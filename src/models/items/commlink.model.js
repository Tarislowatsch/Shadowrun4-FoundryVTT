import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;
export class SR4CommlinkData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      response: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      signal: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      firewall: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      os: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      programms: new fields.ArrayField(new fields.ObjectField()),
    };
  }
}
