const fields = foundry.data.fields;

/**
 * @readonly
 * @enum {string}
 */
export const SecondaryAttributes = Object.freeze({
  WILLPOWER: 'sr4.attributeAbr.willpower',
  LOGIC: 'sr4.attributeAbr.logic',
  INTUITION: 'sr4.attributeAbr.intuition',
  CHARISMA: 'sr4.attributeAbr.charisma',
});

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
 * @typedef {object} SR4BaseDerivedStats
 * @property {number} physical
 * @property {number} woundModifier
 * @property {number} dicePoolModifier
 * @property {number} meleeDamageBonus
 * @property {SR4RealmValues} initiative
 * @property {string} passesString
 * @returns {object}
 */
export function baseDerivedStatsFields() {
  return {
    physical: new fields.NumberField({ initial: 10, integer: true }),
    woundModifier: new fields.NumberField({ initial: 0, integer: true }),
    dicePoolModifier: new fields.NumberField({ initial: 0, integer: true }),
    meleeDamageBonus: new fields.NumberField({ initial: 0, integer: true }),
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
 * @returns {foundry.data.fields.SchemaField}
 */
export function conditionMonitorField() {
  return new fields.SchemaField({
    physical: monitorField(),
    stun: monitorField(),
  });
}

export class SR4GenericItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return genericItemSchema();
  }
}

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
 * @property {number} meleeDefenseModifier
 * @property {number} rangedDefenseModifier
 * @property {number} dodgeModifier
 * @property {number} blockModifier
 * @property {number} parryModifier
 * @property {number} meleeDamageModifier
 * @property {number} unarmedDamageModifier
 * @property {Record<string, number>} skillGroupBonuses
 * @property {Record<string, number>} skillBonuses
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
    meleeDefenseModifier: new fields.NumberField({ initial: 0, integer: true }),
    rangedDefenseModifier: new fields.NumberField({
      initial: 0,
      integer: true,
    }),
    dodgeModifier: new fields.NumberField({ initial: 0, integer: true }),
    blockModifier: new fields.NumberField({ initial: 0, integer: true }),
    parryModifier: new fields.NumberField({ initial: 0, integer: true }),
    meleeDamageModifier: new fields.NumberField({ initial: 0, integer: true }),
    unarmedDamageModifier: new fields.NumberField({
      initial: 0,
      integer: true,
    }),
    soakBonus: new fields.NumberField({ initial: 0, integer: true }),
    skillGroupBonuses: new fields.ObjectField({ initial: {} }),
    skillBonuses: new fields.ObjectField({ initial: {} }),
  });

/**
 * @returns {object}
 */
export function summonedEntityFields() {
  return {
    ownerUuid: new fields.StringField({ initial: '', blank: true }),
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

export function genericWeaponSchema() {
  return {
    ap: new fields.NumberField({ initial: 0, integer: true }),
    attackSkill: new fields.StringField({ initial: '' }),
    category: new fields.StringField({ initial: '', blank: true }),
    damageType: new fields.StringField({ initial: '' }),
    damage: new fields.NumberField({ initial: 0, integer: true }),
    installedModIds: new fields.ArrayField(new fields.StringField()),
    modSlots: new fields.NumberField({ initial: 6, integer: true }),
  };
}

/**
 * @param {{ notes?: boolean, source?: boolean }} [options]
 * @returns {object}
 */
export function descriptionFields({ notes = true, source = true } = {}) {
  const result = { description: new fields.HTMLField({ initial: '' }) };
  if (notes)
    result.notes = new fields.StringField({ initial: '', blank: true });
  if (source)
    result.source = new fields.StringField({ initial: '', blank: true });
  return result;
}

/**
 * @returns {foundry.data.fields.SchemaField}
 */
export function qualitiesField() {
  return new fields.SchemaField({
    positive: new fields.ArrayField(new fields.StringField()),
    negative: new fields.ArrayField(new fields.StringField()),
  });
}

/** @type {string[]} */
export const SR4_ATTRIBUTE_KEYS = Object.freeze([
  'body',
  'agility',
  'reaction',
  'strength',
  'charisma',
  'intuition',
  'logic',
  'willpower',
  'initiative',
  'edge',
  'magic',
  'resonance',
  'essence',
]);

/**
 * @param {(key: string) => foundry.data.fields.DataField} fieldFactory
 * @returns {foundry.data.fields.SchemaField}
 */
export function attributeBlockField(fieldFactory) {
  return new fields.SchemaField(
    Object.fromEntries(
      SR4_ATTRIBUTE_KEYS.map((key) => [key, fieldFactory(key)])
    )
  );
}

/**
 * @param {object|null|undefined} source
 * @param {string} key
 * @param {Record<string, string>} map
 */
export function migrateLegacyValue(source, key, map) {
  if (!source) return;
  if (typeof source[key] === 'string' && source[key] in map) {
    source[key] = map[source[key]];
  }
}
