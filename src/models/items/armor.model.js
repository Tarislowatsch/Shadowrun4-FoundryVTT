import { genericItemSchema } from '@models/shared';

const fields = foundry.data.fields;
/**
 * System data for an armor item.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class SR4ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ballisticarmor: new fields.NumberField({ initial: 0, integer: true }),
      impactarmor: new fields.NumberField({ initial: 0, integer: true }),
    };
  }
}
