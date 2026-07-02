const fields = foundry.data.fields;

import {
  conditionMonitorField,
  baseDerivedStatsFields,
  SR4SheetStatsData,
  modifiersField,
  migrateLegacyValue,
} from '@models/shared';
import { computeDerivedStats } from '@documents/derivedStats.mapper';

/**
 * @typedef {import('@models/shared').SR4ConditionMonitor} SharedSR4ConditionMonitor
 * @typedef {import('@models/shared').SR4RealmValues} SR4Realms
 * @typedef {import('@models/shared').SR4SheetStats} SR4SheetStats
 * @typedef {import('@models/shared').SR4Modifiers} SR4Modifiers
 */

export { SR4SheetStatsData, modifiersField };

/**
 * @typedef {object} SR4Armor
 * @property {number} ballistic
 * @property {number} impact
 * @property {number} encumbrance
 */

export const armorField = () =>
  new fields.SchemaField({
    ballistic: new fields.NumberField({ initial: 0, integer: true }),
    impact: new fields.NumberField({ initial: 0, integer: true }),
    encumbrance: new fields.NumberField({ initial: 0, integer: true }),
  });

/**
 * @typedef {import('@models/shared').SR4BaseDerivedStats & {
 *   stun: number,
 *   overflow: number,
 *   essenceLossBio: number,
 *   essenceLossCyber: number,
 *   judgeIntentions: number,
 *   liftCarry: number,
 *   memory: number,
 *   composure: number,
 *   augmentedMaximum: object,
 *   attributeMaximum: object,
 *   attributeMinimum: object,
 *   finalStats: SR4SheetStats,
 * }} SR4DerivedStats
 */

export const derivedStatsField = () =>
  new fields.SchemaField({
    ...baseDerivedStatsFields(),
    stun: new fields.NumberField({ initial: 10, integer: true }),
    overflow: new fields.NumberField({ initial: 0, integer: true }),
    essenceLossBio: new fields.NumberField({ initial: 0 }),
    essenceLossCyber: new fields.NumberField({ initial: 0 }),
    judgeIntentions: new fields.NumberField({ initial: 6, integer: true }),
    liftCarry: new fields.NumberField({ initial: 6, integer: true }),
    memory: new fields.NumberField({ initial: 6, integer: true }),
    composure: new fields.NumberField({ initial: 6, integer: true }),
    augmentedMaximum: new fields.ObjectField({ initial: {} }),
    attributeMaximum: new fields.ObjectField({ initial: {} }),
    attributeMinimum: new fields.ObjectField({ initial: {} }),
    finalStats: new SR4SheetStatsData(),
  });

/**
 * @typedef {object} SR4DescriptionAndNotes
 * @property {string} bio
 * @property {string} notes
 * @property {string} realName
 * @property {string} gender
 * @property {string} metatype
 * @property {string} height
 * @property {string} weight
 * @property {string} eyes
 * @property {string} hair
 * @property {string} skin
 */

export const descriptionField = () =>
  new fields.SchemaField({
    bio: new fields.HTMLField({ initial: '' }),
    notes: new fields.HTMLField({ initial: '' }),
    realName: new fields.StringField({ initial: '' }),
    gender: new fields.StringField({ initial: 'Unknown' }),
    metatype: new fields.StringField({ initial: 'Human' }),
    height: new fields.StringField({ initial: '180' }),
    weight: new fields.StringField({ initial: '75' }),
    eyes: new fields.StringField({ initial: 'Brown' }),
    hair: new fields.StringField({ initial: 'Black' }),
    skin: new fields.StringField({ initial: 'Fair' }),
  });

/**
 * @typedef {object} SR4BaseMetaData
 * @property {number} movement
 */

export const baseMetaDataField = () =>
  new fields.SchemaField({
    movement: new fields.NumberField({ initial: 0, integer: true }),
  });

/**
 * @typedef {object} SR4CharacterMetaData
 * @property {number} movement
 * @property {number} age
 * @property {number} nuyen
 * @property {number} totalKarma
 * @property {number} karma
 * @property {number} streetCred
 * @property {number} notoriety
 * @property {number} publicAwareness
 * @property {string} lifestyle
 */

export const characterMetaDataField = () =>
  new fields.SchemaField({
    nuyen: new fields.NumberField({ initial: 0, integer: true }),
    movement: new fields.NumberField({ initial: 0, integer: true }),
    age: new fields.NumberField({ initial: 25, integer: true }),
    totalKarma: new fields.NumberField({ initial: 0, integer: true }),
    karma: new fields.NumberField({ initial: 0, integer: true }),
    lifestyle: new fields.StringField({ initial: 'low' }),
    streetCred: new fields.NumberField({ initial: 0, integer: true }),
    notoriety: new fields.NumberField({ initial: 0, integer: true }),
    publicAwareness: new fields.NumberField({ initial: 0, integer: true }),
  });

/**
 * @typedef {object} SR4MagicData
 * @property {'LOGIC' | 'CHARISMA' | 'INTUITION'} drainAttribute
 * @property {number} drainBonus
 * @property {number} summoningDrainBonus
 * @property {string} tradition
 * @property {string} totem
 * @property {number} traditionBonus
 * @property {boolean} adept
 * @property {boolean} magician
 */
export const magicField = () =>
  new fields.SchemaField({
    drainAttribute: new fields.StringField({
      initial: 'LOGIC',
      choices: ['LOGIC', 'CHARISMA', 'INTUITION'],
      blank: false,
    }),

    drainBonus: new fields.NumberField({ initial: 0, integer: true }),

    summoningDrainBonus: new fields.NumberField({ initial: 0, integer: true }),

    tradition: new fields.StringField({
      initial: '',
      choices: [
        '',
        'ABORIGINAL',
        'AZTEC',
        'BLACK_MAGIC',
        'BUDDHIST',
        'CHAOS_MAGIC',
        'CHRISTIAN_THEURGY',
        'DRUIDIC',
        'EGYPTIAN',
        'GARDNERIAN_WICCA',
        'GODDESS_WICCA',
        'HERMETIC',
        'HINDU',
        'INSECT',
        'ISLAMIC',
        'NORSE',
        'PATH_OF_THE_WHEEL',
        'POISONER',
        'PSIONIC',
        'QABBALISTIC',
        'RASTAFARIAN',
        'SHAMANIC',
        'SHINTO',
        'VOODOO',
        'WITCHCRAFT',
        'WUXING',
        'ZOROASTRIAN',
      ],
      blank: true,
    }),
    adept: new fields.BooleanField({ initial: false }),
    magician: new fields.BooleanField({ initial: false }),

    totem: new fields.StringField({ initial: '', blank: true }),

    traditionBonus: new fields.NumberField({ initial: 0, integer: true }),

    spiritAffinities: new fields.SchemaField({
      COMBAT: new fields.StringField({ initial: '', blank: true }),
      DETECTION: new fields.StringField({ initial: '', blank: true }),
      HEALTH: new fields.StringField({ initial: '', blank: true }),
      ILLUSION: new fields.StringField({ initial: '', blank: true }),
      MANIPULATION: new fields.StringField({ initial: '', blank: true }),
    }),
  });

/**
 * @typedef {object} SR4TechnomancyData
 * @property {boolean} technomancer
 * @property {string} stream
 * @property {'WILLPOWER'|'INTUITION'|'CHARISMA'|'LOGIC'} fadingAttribute
 * @property {number} compilingFadingBonus
 * @property {Record<string,string>} spriteAffinities
 */
export const technomancyField = () =>
  new fields.SchemaField({
    technomancer: new fields.BooleanField({ initial: false }),
    stream: new fields.StringField({ initial: '', blank: true }),
    fadingAttribute: new fields.StringField({
      initial: 'WILLPOWER',
      choices: ['WILLPOWER', 'INTUITION', 'CHARISMA', 'LOGIC'],
      blank: false,
    }),
    compilingFadingBonus: new fields.NumberField({ initial: 0, integer: true }),
    spriteAffinities: new fields.SchemaField({
      CODE: new fields.StringField({ initial: '', blank: true }),
      COURIER: new fields.StringField({ initial: '', blank: true }),
      CRACK: new fields.StringField({ initial: '', blank: true }),
      DATA: new fields.StringField({ initial: '', blank: true }),
      FAULT: new fields.StringField({ initial: '', blank: true }),
      MACHINE: new fields.StringField({ initial: '', blank: true }),
      PALADIN: new fields.StringField({ initial: '', blank: true }),
      SLEUTH: new fields.StringField({ initial: '', blank: true }),
      TANK: new fields.StringField({ initial: '', blank: true }),
      TUTOR: new fields.StringField({ initial: '', blank: true }),
    }),
  });

/**
 * @typedef {object} SR4Connection
 * @property {string} name
 * @property {number} connection
 * @property {number} groupConnection
 * @property {number} loyalty
 * @property {'Contact' | 'Enemy'} type
 * @property {string} archetype
 * @property {string} notes
 */

export const RESISTANCE_ELEMENTS = [
  'FIRE',
  'ELECTRICITY',
  'COLD',
  'ACID',
  'BLAST',
  'LIGHT',
  'METAL',
  'TOXIN',
  'RADIATION',
  'SOUND',
  'WATER',
  'SAND',
  'SMOKE',
];

/**
 * @typedef {object} SR4ElementResistance
 * @property {string} element
 * @property {number} value
 */

export const elementResistancesField = () =>
  new fields.TypedObjectField(
    new fields.SchemaField({
      element: new fields.StringField({
        initial: 'FIRE',
        choices: RESISTANCE_ELEMENTS,
        blank: false,
      }),
      value: new fields.NumberField({ initial: 0, integer: true }),
    })
  );

export const connectionsField = () =>
  new fields.TypedObjectField(
    new fields.SchemaField({
      name: new fields.StringField({ initial: '' }),
      connection: new fields.NumberField({ initial: 1, integer: true, min: 1 }),
      groupConnection: new fields.NumberField({ initial: 0, integer: true }),
      loyalty: new fields.NumberField({ initial: 1, integer: true, min: 1 }),
      type: new fields.StringField({
        initial: 'Contact',
        choices: ['Contact', 'Enemy'],
        blank: false,
      }),
      archetype: new fields.StringField({ initial: '' }),
      notes: new fields.StringField({ initial: '' }),
    })
  );

// Armor Stacking & Encumbrance (SR4 p.161, Form-Fitting: Arsenal p.48)

/**
 * @param {any} item
 * @param {'effectiveBallistic'|'effectiveImpact'} key
 */
function armorValue(item, key) {
  return (
    item.system?.[key] ??
    item.system?.[
      key === 'effectiveBallistic' ? 'ballisticarmor' : 'impactarmor'
    ] ??
    0
  );
}

/**
 * @param {any[]} equipped
 * @param {{ ballistic: number, impact: number }} bonus
 * @param {number} body
 * @returns {{ ballistic: number, impact: number, encumbrance: number }}
 */
export function computeArmorStacking(equipped, bonus, body) {
  const standard = [];
  const accessories = [];
  const formFitting = [];
  for (const item of equipped) {
    const type = item.system?.stackingType ?? 'standard';
    if (type === 'accessory') accessories.push(item);
    else if (type === 'formFitting') formFitting.push(item);
    else standard.push(item);
  }

  const sum = (arr, key) => arr.reduce((s, i) => s + armorValue(i, key), 0);

  const bestBallistic = standard.reduce(
    (m, i) => Math.max(m, armorValue(i, 'effectiveBallistic')),
    0
  );
  const bestImpact = standard.reduce(
    (m, i) => Math.max(m, armorValue(i, 'effectiveImpact')),
    0
  );

  const ballistic =
    bestBallistic +
    sum(formFitting, 'effectiveBallistic') +
    sum(accessories, 'effectiveBallistic') +
    bonus.ballistic;
  const impact =
    bestImpact +
    sum(formFitting, 'effectiveImpact') +
    sum(accessories, 'effectiveImpact') +
    bonus.impact;

  const encumbranceBallistic =
    sum(standard, 'effectiveBallistic') +
    sum(accessories, 'effectiveBallistic') +
    formFitting.reduce(
      (s, i) => s + Math.floor(armorValue(i, 'effectiveBallistic') / 2),
      0
    ) +
    bonus.ballistic;
  const encumbranceImpact =
    sum(standard, 'effectiveImpact') +
    sum(accessories, 'effectiveImpact') +
    formFitting.reduce(
      (s, i) => s + Math.floor(armorValue(i, 'effectiveImpact') / 2),
      0
    ) +
    bonus.impact;

  const maxAllowed = body * 2;
  const excess = Math.max(
    0,
    Math.max(encumbranceBallistic, encumbranceImpact) - maxAllowed
  );
  const encumbrance = excess > 0 ? Math.ceil(excess / 2) : 0;

  return { ballistic, impact, encumbrance };
}

/** @type {Array<[string, string]>} */
const METATYPE_STAT_MAP = [
  ['body', 'BODY'],
  ['agility', 'AGILITY'],
  ['reaction', 'REACTION'],
  ['strength', 'STRENGTH'],
  ['charisma', 'CHARISMA'],
  ['intuition', 'INTUITION'],
  ['logic', 'LOGIC'],
  ['willpower', 'WILLPOWER'],
  ['edge', 'EDGE'],
  ['magic', 'MAGIC'],
  ['resonance', 'RESONANCE'],
  ['essence', 'ESSENCE'],
];

/**
 * @param {any} self
 * @param {Record<string, { min: number, max: number, aug: number }>} attrs
 */
function applyMetatypeLimits(self, attrs) {
  /** @type {Record<string, number>} */
  const attributeMaximum = {};
  /** @type {Record<string, number>} */
  const augmentedMaximum = {};
  /** @type {Record<string, number>} */
  const attributeMinimum = {};

  const sourceStats = self._source?.sheetStats ?? {};

  for (const [mtKey, ssKey] of METATYPE_STAT_MAP) {
    const limit = attrs[mtKey];
    if (!limit) continue;
    attributeMinimum[ssKey] = limit.min;
    attributeMaximum[ssKey] = limit.max;
    augmentedMaximum[ssKey] = limit.aug;

    if (self.sheetStats[ssKey] === undefined) continue;
    const base = sourceStats[ssKey] ?? self.sheetStats[ssKey];
    const effectBonus = self.sheetStats[ssKey] - base;
    const clampedBase = Math.min(base, limit.max);
    self.sheetStats[ssKey] = Math.max(
      limit.min,
      Math.min(clampedBase + effectBonus, limit.aug)
    );
  }

  self.derivedStats.attributeMinimum = attributeMinimum;
  self.derivedStats.attributeMaximum = attributeMaximum;
  self.derivedStats.augmentedMaximum = augmentedMaximum;
}

/**
 * @typedef {object} SR4BaseCharacterSystem
 * @property {SR4SheetStats}          sheetStats
 * @property {SR4DerivedStats}        derivedStats
 * @property {SR4BaseMetaData}        metaData
 * @property {SR4Modifiers}           modifiers
 * @property {SR4DescriptionAndNotes} descriptionAndNotes
 * @property {SharedSR4ConditionMonitor}    conditionMonitor
 * @property {SR4Armor}               armor
 * @property {Record<string, SR4ElementResistance>} elementResistances
 * @property {SR4MagicData}           magic
 * @property {SR4TechnomancyData}     technomancy
 * @property {boolean}                simpleHp
 * @property {{ firewallBonus: number, responseBonus: number, signalBonus: number, systemBonus: number, biofeedbackFilterBonus: number }} livingPersona
 */

export class SR4BaseCharacterData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.technomancer !== undefined) {
      source.technomancy ??= {};
      source.technomancy.technomancer = source.technomancer;
      delete source.technomancer;
    }
    if (source.magic?.spiritBindings !== undefined) {
      source.magic.spiritAffinities ??= source.magic.spiritBindings;
      delete source.magic.spiritBindings;
    }
    if (source.technomancy?.spriteBindings !== undefined) {
      source.technomancy.spriteAffinities ??= source.technomancy.spriteBindings;
      delete source.technomancy.spriteBindings;
    }
    const traditionMap = {
      NONE: '',
      SHAMAN: 'SHAMANIC',
      WICCA: 'GARDNERIAN_WICCA',
      CHAOS: 'CHAOS_MAGIC',
    };
    migrateLegacyValue(source.magic, 'tradition', traditionMap);
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      sheetStats: new SR4SheetStatsData(),
      derivedStats: derivedStatsField(),
      modifiers: modifiersField(),
      metaData: baseMetaDataField(),
      descriptionAndNotes: descriptionField(),
      conditionMonitor: conditionMonitorField(),
      armor: armorField(),
      elementResistances: elementResistancesField(),
      magic: magicField(),
      technomancy: technomancyField(),
      simpleHp: new fields.BooleanField({ initial: false }),
      livingPersona: new fields.SchemaField({
        firewallBonus: new fields.NumberField({ initial: 0, integer: true }),
        responseBonus: new fields.NumberField({ initial: 0, integer: true }),
        signalBonus: new fields.NumberField({ initial: 0, integer: true }),
        systemBonus: new fields.NumberField({ initial: 0, integer: true }),
        biofeedbackFilterBonus: new fields.NumberField({
          initial: 0,
          integer: true,
        }),
      }),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    if (!self.sheetStats) return;
    const actor = this.parent;
    if (!actor) return;

    const metatypeItem = actor.items.find((i) => i.type === 'Metatype');
    if (metatypeItem) {
      const attrs = metatypeItem.system.attributes;
      applyMetatypeLimits(self, attrs);
    }

    const equipped = actor.items.filter(
      (i) => i.type === 'Armor' && i.system?.equipped === true
    );
    const bonus = {
      ballistic: self.armor.ballistic,
      impact: self.armor.impact,
    };
    const { ballistic, impact, encumbrance } = computeArmorStacking(
      equipped,
      bonus,
      self.sheetStats.BODY
    );

    self.armor.ballistic = ballistic;
    self.armor.impact = impact;
    self.armor.encumbrance = encumbrance;

    if (encumbrance > 0) {
      self.sheetStats.AGILITY = Math.max(
        0,
        self.sheetStats.AGILITY - encumbrance
      );
      self.sheetStats.REACTION = Math.max(
        0,
        self.sheetStats.REACTION - encumbrance
      );
    }

    const implants = actor.items.filter((i) => i.type === 'Implant');
    self.derivedStats.essenceLossCyber = implants
      .filter((i) => i.system.type !== 'BIOWARE')
      .reduce((sum, i) => sum + (i.system.essenceActual ?? 0), 0);
    self.derivedStats.essenceLossBio = implants
      .filter((i) => i.system.type === 'BIOWARE')
      .reduce((sum, i) => sum + (i.system.essenceActual ?? 0), 0);

    Object.assign(self.derivedStats, computeDerivedStats(self));
  }
}

/**
 * @typedef {SR4BaseCharacterSystem & { metaData: SR4CharacterMetaData, connections: Record<string, SR4Connection> }} SR4CharacterSystem
 * @typedef {SR4BaseCharacterData & { system: SR4CharacterSystem }} SR4Character
 */

export class SR4CharacterData extends SR4BaseCharacterData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      metaData: characterMetaDataField(),
      connections: connectionsField(),
      vehicles: new fields.ArrayField(new fields.StringField({ blank: true })),
    };
  }
}

export class SR4NpcData extends SR4BaseCharacterData {}
