const fields = foundry.data.fields;
import { summonedEntityFields } from '@models/shared';
import { computeSpiritDerivedStats } from '@domains/summoned-entity/derived-stats.js';
import { applyDerivedStatsResult } from './derived-stats-helpers.js';

export class SR4SpiritData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      force: new fields.NumberField({ initial: 3, integer: true }),
      spiritType: new fields.StringField({ initial: '', blank: true }),
      services: new fields.NumberField({ initial: 0, integer: true }),
      bound: new fields.BooleanField({ initial: false }),
      ...summonedEntityFields(),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    if (!self.sheetStats) return;
    applyDerivedStatsResult(self, computeSpiritDerivedStats(self));
  }
}
