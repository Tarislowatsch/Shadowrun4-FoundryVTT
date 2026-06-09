import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;
/** DataModel for commlinks (type: "Commlink"). */
export class SR4CommlinkData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      programms: new fields.ArrayField(new fields.ObjectField()),
    };
  }
}
