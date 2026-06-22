const fields = foundry.data.fields;
import { summonedEntityFields } from '@models/shared';
import { computeSpriteDerivedStats } from '@documents/derivedStats.mapper';

export class SR4SpriteData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rating: new fields.NumberField({ initial: 3, integer: true }),
      spriteType: new fields.StringField({ initial: '', blank: true }),
      tasks: new fields.NumberField({ initial: 0, integer: true }),
      ...summonedEntityFields(),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    if (!self.sheetStats) return;
    Object.assign(self.derivedStats, computeSpriteDerivedStats(self));
  }
}
