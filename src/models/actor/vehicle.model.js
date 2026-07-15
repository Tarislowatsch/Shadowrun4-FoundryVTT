const fields = foundry.data.fields;
import {
  monitorField,
  baseDerivedStatsFields,
  modifiersField,
  sumModField,
  descriptionFields,
} from '@models/shared';
import { computeVehicleDerivedStats } from '@documents/derivedStats.mapper';

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
 * @property {'autonomous'|'remote'|'jumped'} controlMode
 * @property {{ attackSkill: string, fullDefenseSkill: string, perceptionSkill: string, infiltrationSkill: string, commandProgram: string }} riggerOverrides
 * @property {number}  effectiveHandling
 * @property {number}  effectiveSpeed
 * @property {number}  effectiveAccel
 * @property {number}  effectiveArmor
 * @property {number}  effectiveSensor
 * @property {number}  effectiveBody
 * @property {number}  effectivePilot
 * @property {number}  usedSlots
 * @property {boolean} slotWarning
 * @property {number}  totalModCost
 * @property {import('@models/shared').SR4Modifiers} modifiers
 * @property {SR4VehicleDerivedStats} derivedStats
 * @property {{ physical: import('@models/shared').SR4Monitor }} conditionMonitor
 */

export class SR4VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...descriptionFields({ source: false, notes: 'html' }),
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
      controlMode: new fields.StringField({
        initial: 'autonomous',
        choices: ['autonomous', 'remote', 'jumped'],
      }),
      riggerOverrides: new fields.SchemaField({
        attackSkill: new fields.StringField({ initial: '', blank: true }),
        fullDefenseSkill: new fields.StringField({ initial: '', blank: true }),
        perceptionSkill: new fields.StringField({ initial: '', blank: true }),
        infiltrationSkill: new fields.StringField({ initial: '', blank: true }),
        commandProgram: new fields.StringField({ initial: '', blank: true }),
      }),
      modifiers: modifiersField(),
      derivedStats: new fields.SchemaField({
        ...baseDerivedStatsFields(),
      }),
      conditionMonitor: new fields.SchemaField({
        physical: monitorField(),
      }),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    const actor = this.parent ?? null;
    const mods = (actor?.items ?? []).filter((i) => i.type === 'Vehicle Mod');

    self.effectiveHandling = self.handling + sumModField(mods, 'handlingBonus');
    self.effectiveSpeed = self.speed + sumModField(mods, 'speedBonus');
    self.effectiveAccel = self.accel + sumModField(mods, 'accelBonus');
    self.effectiveArmor = self.armor + sumModField(mods, 'armorBonus');
    self.effectiveSensor = self.sensor + sumModField(mods, 'sensorBonus');
    self.effectiveBody = self.body + sumModField(mods, 'bodyBonus');
    self.effectivePilot = self.pilot + sumModField(mods, 'pilotBonus');
    self.usedSlots = sumModField(mods, 'slotCost');
    self.slotWarning = self.usedSlots > self.body;
    self.totalModCost = sumModField(mods, 'cost');

    Object.assign(self.derivedStats, computeVehicleDerivedStats(self));
  }
}
