const fields = foundry.data.fields;
import {
  conditionMonitorField,
  baseDerivedStatsFields,
  SR4SheetStatsData,
  modifiersField,
} from '@models/shared';

/**
 * @typedef {import('@models/shared').SR4BaseDerivedStats & { stun: number }} SR4SpiritDerivedStats
 */

/**
 * @typedef {object} SR4SpiritSystem
 * @property {number}  force
 * @property {string}  spiritType
 * @property {string}  ownerUuid
 * @property {number}  services
 * @property {import('@models/shared').SR4SheetStats} sheetStats
 * @property {SR4SpiritDerivedStats} derivedStats
 * @property {import('@models/shared').SR4ConditionMonitor} conditionMonitor
 * @property {import('@models/shared').SR4Modifiers} modifiers
 * @property {string}  notes
 */

export class SR4SpiritData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      force: new fields.NumberField({ initial: 3, integer: true }),
      spiritType: new fields.StringField({ initial: '', blank: true }),
      ownerUuid: new fields.StringField({ initial: '', blank: true }),
      services: new fields.NumberField({ initial: 0, integer: true }),
      sheetStats: new SR4SheetStatsData(),
      modifiers: modifiersField(),
      derivedStats: new fields.SchemaField({
        ...baseDerivedStatsFields(),
        stun: new fields.NumberField({ initial: 10, integer: true }),
      }),
      conditionMonitor: conditionMonitorField(),
      notes: new fields.HTMLField({ initial: '' }),
    };
  }
}
