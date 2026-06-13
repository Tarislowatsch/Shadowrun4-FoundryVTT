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
function realmField(initial = 0) {
  return new fields.SchemaField({
    physical: new fields.NumberField({ initial, integer: true }),
    astral: new fields.NumberField({ initial, integer: true }),
    matrix: new fields.NumberField({ initial, integer: true }),
  });
}

/**
 * Minimal derived stats shared by all actor types.
 * @typedef {object} SR4BaseDerivedStats
 * @property {number}        physical        - Physical monitor max
 * @property {number}        woundModifier   - Wound penalty magnitude (positive)
 * @property {number}        dicePoolModifier - Combined modifier (wounds + effects)
 * @property {SR4RealmValues} initiative
 * @property {string}        passesString    - Initiative passes e.g. "1/1/1"
 */

/**
 * @returns {object} SchemaField contents for SR4BaseDerivedStats
 */
export function baseDerivedStatsFields() {
  return {
    physical: new fields.NumberField({ initial: 10, integer: true }),
    woundModifier: new fields.NumberField({ initial: 0, integer: true }),
    dicePoolModifier: new fields.NumberField({ initial: 0, integer: true }),
    initiative: realmField(1),
    passesString: new fields.StringField({ initial: '1/0/0' }),
  };
}

/**
 * @typedef {object} SR4Monitor
 * @property {number} value
 * @property {number} max
 * @returns {foundry.data.fields.SchemaField}
 */
export function monitorField() {
  return new fields.SchemaField({
    max: new fields.NumberField({ initial: 10, integer: true }),
    value: new fields.NumberField({ initial: 0, integer: true }),
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

// ---------------------------------------------------------------------------
// SheetStats
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SR4SheetStats
 * @property {number} BODY
 * @property {number} CHARISMA
 * @property {number} EDGE
 * @property {number} CURRENTEDGE
 * @property {number} AGILITY
 * @property {number} INTUITION
 * @property {number} ESSENCE
 * @property {number} ASTRALINITIATIVE
 * @property {number} REACTION
 * @property {number} LOGIC
 * @property {number} INITIATIVE
 * @property {number} MATRIXINITIATIVE
 * @property {number} STRENGTH
 * @property {number} WILLPOWER
 * @property {number} MAGIC
 * @property {number} RESONANCE
 */

export class SR4SheetStatsData extends fields.SchemaField {
  constructor() {
    super({
      BODY: new fields.NumberField({ initial: 1, integer: true }),
      CHARISMA: new fields.NumberField({ initial: 1, integer: true }),
      EDGE: new fields.NumberField({ initial: 1, integer: true }),
      CURRENTEDGE: new fields.NumberField({ initial: 1, integer: true }),
      AGILITY: new fields.NumberField({ initial: 1, integer: true }),
      INTUITION: new fields.NumberField({ initial: 1, integer: true }),
      ESSENCE: new fields.NumberField({ initial: 6 }),
      ASTRALINITIATIVE: new fields.NumberField({ initial: 0, integer: true }),
      REACTION: new fields.NumberField({ initial: 1, integer: true }),
      LOGIC: new fields.NumberField({ initial: 1, integer: true }),
      INITIATIVE: new fields.NumberField({ initial: 2, integer: true }),
      MATRIXINITIATIVE: new fields.NumberField({ initial: 2, integer: true }),
      STRENGTH: new fields.NumberField({ initial: 1, integer: true }),
      WILLPOWER: new fields.NumberField({ initial: 1, integer: true }),
      MAGIC: new fields.NumberField({ initial: 0, integer: true }),
      RESONANCE: new fields.NumberField({ initial: 0, integer: true }),
    });
  }
}

// ---------------------------------------------------------------------------
// Modifiers
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SR4Modifiers
 * @property {{
 *   bonuses: SR4RealmValues,
 *   passes: SR4RealmValues
 * }} initiative
 * @property {number} overflowBonus
 * @property {number} woundModBonus
 * @property {number} soakBonus
 * @property {number} generalModifier
 * @property {number} attackModifier
 * @property {number} defenseModifier
 */

export const modifiersField = () =>
  new fields.SchemaField({
    initiative: new fields.SchemaField({
      bonuses: realmField(),
      passes: realmField(0),
    }),
    overflowBonus: new fields.NumberField({ initial: 0, integer: true }),
    woundModBonus: new fields.NumberField({ initial: 0, integer: true }),
    generalModifier: new fields.NumberField({ initial: 0, integer: true }),
    attackModifier: new fields.NumberField({ initial: 0, integer: true }),
    defenseModifier: new fields.NumberField({ initial: 0, integer: true }),
    soakBonus: new fields.NumberField({ initial: 0, integer: true }),
  });

// ---------------------------------------------------------------------------
// Weapons (generic)
// ---------------------------------------------------------------------------

/**
 * Returns the shared genericWeapon schema fields.
 *
 * @returns {object}
 */
export function genericWeaponSchema() {
  return {
    ap: new fields.NumberField({ initial: 0, integer: true }),
    attackSkill: new fields.StringField({ initial: '' }),
    damageType: new fields.StringField({ initial: '' }),
    damage: new fields.NumberField({ initial: 0, integer: true }),
  };
}
