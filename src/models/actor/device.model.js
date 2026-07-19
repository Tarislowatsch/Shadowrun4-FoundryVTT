const fields = foundry.data.fields;
import {
  conditionMonitorField,
  baseDerivedStatsFields,
  SR4SheetStatsData,
  modifiersField,
  REALM_CHOICES,
} from '@models/shared';
import { computeMatrixMonitorMax } from '@documents/derivedStats.mapper';

/** @type {readonly string[]} */
export const DEVICE_TYPES = Object.freeze(['agent', 'ic', 'blackIc', 'node']);

/**
 * @typedef {object} SR4DeviceSystem
 * @property {number} pilot
 * @property {number} response
 * @property {number} signal
 * @property {number} firewall
 * @property {number} system
 * @property {'agent'|'ic'|'blackIc'|'node'} deviceType
 * @property {import('@models/shared').SR4SheetStats} sheetStats
 * @property {import('@models/shared').SR4Modifiers} modifiers
 * @property {import('@models/shared').SR4ConditionMonitor} conditionMonitor
 * @property {import('@models/shared').SR4BaseDerivedStats} derivedStats
 * @property {string} notes
 * @property {string} realm
 */

export class SR4DeviceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      pilot: new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      response: new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      signal: new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      firewall: new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      system: new fields.NumberField({ initial: 3, integer: true, min: 0 }),
      deviceType: new fields.StringField({
        initial: 'ic',
        choices: [...DEVICE_TYPES],
        blank: false,
      }),
      sheetStats: new SR4SheetStatsData(),
      modifiers: modifiersField(),
      derivedStats: new fields.SchemaField({
        ...baseDerivedStatsFields(),
        stun: new fields.NumberField({ initial: 10, integer: true }),
      }),
      conditionMonitor: conditionMonitorField(),
      notes: new fields.HTMLField({ initial: '' }),
      realm: new fields.StringField({
        initial: 'matrix',
        choices: [...REALM_CHOICES],
        blank: false,
      }),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    const derived = self.derivedStats;
    const monitor = self.conditionMonitor;

    derived.initiative.matrix = (self.pilot ?? 0) + (self.response ?? 0);
    derived.initiative.physical = 0;
    derived.initiative.astral = 0;
    derived.passesString = '0/3/0';

    if (monitor?.matrix)
      monitor.matrix.max = computeMatrixMonitorMax(self.system);
    if (monitor?.physical)
      monitor.physical.max = computeMatrixMonitorMax(self.system);
    if (monitor?.stun) monitor.stun.max = computeMatrixMonitorMax(self.system);
  }
}
