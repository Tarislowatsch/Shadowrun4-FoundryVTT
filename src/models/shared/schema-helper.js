/**
 * Returns the shared genericItem schema fields.
 *
 * @returns {object}
 */
const fields = foundry.data.fields;

export function genericItemSchema() {
  return {
    description: new fields.HTMLField({ initial: '' }),
    cost: new fields.NumberField({ initial: 0, integer: true }),
    avail: new fields.NumberField({ initial: 0, integer: true }),
    quantity: new fields.NumberField({ initial: 0, integer: true }),
    legality: new fields.StringField({ initial: '' }),
    availability: new fields.StringField({ initial: '' }),
    capacity: new fields.NumberField({ initial: null, nullable: true }),
    rating: new fields.NumberField({ initial: null, nullable: true }),
    label: new fields.StringField({ initial: '' }),
    modable: new fields.BooleanField({ initial: false }),
    mods: new fields.ArrayField(new fields.ObjectField()),
    notes: new fields.StringField({ initial: '' }),
    source: new fields.StringField({ initial: '' }),
    equipped: new fields.BooleanField({ initial: false }),
  };
}

/**
 * Creates a SchemaField with physical/astral/matrix number sub-fields.
 * @typedef {object} SR4RealmValues
 * @property {number} physical
 * @property {number} matrix
 * @property {number} astral
 * @param {number} [initial=0]
 * @returns {foundry.data.fields.SchemaField}
 */
export function realmField(initial = 0) {
  return new fields.SchemaField({
    physical: new fields.NumberField({ initial, integer: true }),
    astral: new fields.NumberField({ initial, integer: true }),
    matrix: new fields.NumberField({ initial, integer: true }),
  });
}

/**
 * @typedef {object} SR4Monitor
 * @property {number} current
 * @property {number} max
 * @returns {foundry.data.fields.SchemaField}
 */
export function monitorField() {
  return new fields.SchemaField({
    max: new fields.NumberField({ initial: 10, integer: true }),
    current: new fields.NumberField({ initial: 0, integer: true }),
    bonus: new fields.NumberField({ initial: 0, integer: true }),
    woundMod: new fields.NumberField({ initial: 0, integer: true }),
  });
}
/**
 * @typedef {object} SR4ConditionMonitor
 * @property {SR4Monitor} physical
 * @property {SR4Monitor} stun
 */
export function conditionMonitorField() {
  return new fields.SchemaField({
    physical: monitorField(),
    stun: monitorField(),
  });
}

/**
 * Generic fallback DataModel for simple item types.
 * Used for: Program, Focus, Fetish, Item.
 */
export class SR4GenericItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return genericItemSchema();
  }
}

/**
 * Returns the shared genericWeapon schema fields.
 *
 * @returns {object}
 */
export function genericWeaponSchema() {
  return {
    ap: new fields.StringField({ initial: '' }),
    attackSkill: new fields.StringField({ initial: '' }),
    damageType: new fields.StringField({ initial: '' }),
    damage: new fields.StringField({ initial: '' }),
  };
}
