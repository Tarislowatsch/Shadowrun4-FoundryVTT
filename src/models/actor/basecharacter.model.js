const fields = foundry.data.fields;

import {
  conditionMonitorField,
  baseDerivedStatsFields,
  SR4SheetStatsData,
  modifiersField,
} from '@models/shared';

/**
 * @typedef {import('@models/shared').SR4ConditionMonitor} SharedSR4ConditionMonitor
 * @typedef {import('@models/shared').SR4RealmValues} SR4Realms
 * @typedef {import('@models/shared').SR4SheetStats} SR4SheetStats
 * @typedef {import('@models/shared').SR4Modifiers} SR4Modifiers
 */

export { SR4SheetStatsData, modifiersField };

// ---------------------------------------------------------------------------
// Armor
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SR4Armor
 * @property {number} ballistic
 * @property {number} impact
 */

export const armorField = () =>
  new fields.SchemaField({
    ballistic: new fields.NumberField({ initial: 0, integer: true }),
    impact: new fields.NumberField({ initial: 0, integer: true }),
  });

// ---------------------------------------------------------------------------
// DerivedStats
// ---------------------------------------------------------------------------

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
    finalStats: new SR4SheetStatsData(),
  });

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SR4DescriptionAndNotes
 * @property {string} bio
 * @property {string} notes
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
    gender: new fields.StringField({ initial: 'Unknown' }),
    metatype: new fields.StringField({ initial: 'Human' }),
    height: new fields.StringField({ initial: '180' }),
    weight: new fields.StringField({ initial: '75' }),
    eyes: new fields.StringField({ initial: 'Brown' }),
    hair: new fields.StringField({ initial: 'Black' }),
    skin: new fields.StringField({ initial: 'Fair' }),
  });

// ---------------------------------------------------------------------------
// MetaData
// ---------------------------------------------------------------------------

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
    movement: new fields.NumberField({ initial: 0, integer: true }),
    age: new fields.NumberField({ initial: 25, integer: true }),
    nuyen: new fields.NumberField({ initial: 0, integer: true }),
    totalKarma: new fields.NumberField({ initial: 0, integer: true }),
    karma: new fields.NumberField({ initial: 0, integer: true }),
    lifestyle: new fields.StringField({ initial: 'low' }),
    notoriety: new fields.NumberField({ initial: 0, integer: true }),
    publicAwareness: new fields.NumberField({ initial: 0, integer: true }),
    streetCred: new fields.NumberField({ initial: 0, integer: true }),
  });

/**
 * @typedef {object} SR4MagicData
 * @property {'LOGIC' | 'CHARISMA' | 'INTUITION'} drainAttribute
 * @property {number} drainBonus
 * @property {number} summoningDrainBonus
 * @property {'hermetic' | 'shaman' | 'wicca' | 'chaos' | ''} tradition
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
      choices: ['HERMETIC', 'SHAMAN', 'WICCA', 'CHAOS', 'NONE'], // erweiterbar
      blank: true,
    }),
    adept: new fields.BooleanField({ initial: false }),
    magician: new fields.BooleanField({ initial: false }),

    totem: new fields.StringField({ initial: '', blank: true }),

    traditionBonus: new fields.NumberField({ initial: 0, integer: true }),
  });
// ---------------------------------------------------------------------------
// BaseCharacterData
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SR4BaseCharacterSystem
 * @property {SR4SheetStats}          sheetStats
 * @property {SR4DerivedStats}        derivedStats
 * @property {SR4BaseMetaData}        metaData
 * @property {SR4Modifiers}           modifiers
 * @property {SR4DescriptionAndNotes} descriptionAndNotes
 * @property {SharedSR4ConditionMonitor}    conditionMonitor
 * @property {SR4Armor}               armor
 * @property {SR4MagicData}           magic
 * @property {boolean}                simpleHp
 * @property {boolean}                technomancer
 * @property {{ firewallBonus: number, responseBonus: number, signalBonus: number, systemBonus: number, biofeedbackFilterBonus: number }} livingPersona
 */

export class SR4BaseCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      sheetStats: new SR4SheetStatsData(),
      derivedStats: derivedStatsField(),
      modifiers: modifiersField(),
      metaData: baseMetaDataField(),
      descriptionAndNotes: descriptionField(),
      conditionMonitor: conditionMonitorField(),
      armor: armorField(),
      magic: magicField(),
      simpleHp: new fields.BooleanField({ initial: false }),
      technomancer: new fields.BooleanField({ initial: false }),
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
}

// ---------------------------------------------------------------------------
// CharacterData
// ---------------------------------------------------------------------------

/**
 * @typedef {SR4BaseCharacterSystem & { metaData: SR4CharacterMetaData }} SR4CharacterSystem
 * @typedef {SR4BaseCharacterData & { system: SR4CharacterSystem }} SR4Character
 */

export class SR4CharacterData extends SR4BaseCharacterData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      metaData: characterMetaDataField(),
      vehicles: new fields.ArrayField(new fields.StringField({ blank: true })),
    };
  }
}

// ---------------------------------------------------------------------------
// NpcData
// ---------------------------------------------------------------------------

/** DataModel for NPCs (type: "npc"). */
export class SR4NpcData extends SR4BaseCharacterData {}
