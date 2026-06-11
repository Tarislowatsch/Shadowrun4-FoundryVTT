const fields = foundry.data.fields;
import { monitorField, baseDerivedStatsFields } from '@models/shared';

/**
 * @typedef {import('@models/shared').SR4BaseDerivedStats} SR4VehicleDerivedStats
 */

/**
 * @typedef {object} SR4VehicleSystem
 * @property {string}  description
 * @property {string}  notes
 * @property {number}  cost
 * @property {string}  availability
 * @property {string}  legality
 * @property {string}  vehicleType
 * @property {number}  body
 * @property {number}  pilot
 * @property {number}  response
 * @property {number}  armor
 * @property {number}  sensor
 * @property {number}  handling
 * @property {number}  speed
 * @property {number}  accel
 * @property {string}  riggerUuid
 * @property {SR4VehicleDerivedStats} derivedStats
 * @property {{ physical: import('@models/shared').SR4Monitor }} conditionMonitor
 */

export class SR4VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: '' }),
      notes: new fields.HTMLField({ initial: '' }),
      cost: new fields.NumberField({ initial: 0, integer: true }),
      availability: new fields.StringField({ initial: '' }),
      legality: new fields.StringField({ initial: '' }),
      vehicleType: new fields.StringField({ initial: '' }),
      body: new fields.NumberField({ initial: 3, integer: true }),
      pilot: new fields.NumberField({ initial: 1, integer: true }),
      response: new fields.NumberField({ initial: 1, integer: true }),
      armor: new fields.NumberField({ initial: 0, integer: true }),
      sensor: new fields.NumberField({ initial: 1, integer: true }),
      handling: new fields.NumberField({ initial: 3, integer: true }),
      speed: new fields.NumberField({ initial: 3, integer: true }),
      accel: new fields.NumberField({ initial: 2, integer: true }),
      riggerUuid: new fields.StringField({ initial: '', blank: true }),
      derivedStats: new fields.SchemaField({
        ...baseDerivedStatsFields(),
      }),
      conditionMonitor: new fields.SchemaField({
        physical: monitorField(),
      }),
    };
  }
}
