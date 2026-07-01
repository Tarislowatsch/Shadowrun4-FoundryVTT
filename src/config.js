/**
 * @typedef {object} SR4Rules
 * @property {number} successThreshold
 * @property {number} conditionMonitorBase
 * @property {number} woundModifierDivisor
 * @property {number} edgeInitiativeSentinel
 */

/**
 * @typedef {object} SR4Workflow
 * @property {number} opposedRollFallbackBufferSeconds
 */

/**
 * @typedef {object} SR4Config
 *
 * @property {SR4Rules} rules
 *
 * @property {SR4Workflow} workflow
 *
 * @property {{
 *   blades: string,
 *   clubs: string,
 *   cyberware: string,
 *   unarmed: string,
 *   exoticMelee: string,
 *   exoticRanged: string,
 *   pistols: string,
 *   automatics: string,
 *   longarms: string,
 *   thrown: string,
 * }} attackTypes
 *
 * @property {string[]} attributeAbr
 *
 * @property {{
 *   BODY: keyof import('@models/index').SR4SheetStats,
 *   CHARISMA: keyof import('@models/index').SR4SheetStats,
 *   EDGE: keyof import('@models/index').SR4SheetStats,
 *   CURRENTEDGE: keyof import('@models/index').SR4SheetStats,
 *   AGILITY: keyof import('@models/index').SR4SheetStats,
 *   INTUITION: keyof import('@models/index').SR4SheetStats,
 *   ESSENCE: keyof import('@models/index').SR4SheetStats,
 *   ASTRALINITIATIVE: keyof import('@models/index').SR4SheetStats,
 *   REACTION: keyof import('@models/index').SR4SheetStats,
 *   LOGIC: keyof import('@models/index').SR4SheetStats,
 *   INITIATIVE: keyof import('@models/index').SR4SheetStats,
 *   MATRIXINITIATIVE: keyof import('@models/index').SR4SheetStats,
 *   STRENGTH: keyof import('@models/index').SR4SheetStats,
 *   WILLPOWER: keyof import('@models/index').SR4SheetStats,
 *   MAGIC: keyof import('@models/index').SR4SheetStats,
 *   RESONANCE: keyof import('@models/index').SR4SheetStats,
 * }} attributes
 */
export const SR4 = {
  rules: {
    successThreshold: 5,
    conditionMonitorBase: 8,
    woundModifierDivisor: 3,
    edgeInitiativeSentinel: 99,
  },
  workflow: {
    opposedRollFallbackBufferSeconds: 10,
  },
  attackTypes: {
    blades: 'sr4.AttackTypeBlades',
    clubs: 'sr4.AttackTypeClubs',
    cyberware: 'sr4.AttackTypeCyberware',
    unarmed: 'sr4.AttackTypeUnarmed',
    exoticMelee: 'sr4.AttackTypeExoticMelee',
    exoticRanged: 'sr4.AttackTypeExoticRanged',
    pistols: 'sr4.AttackTypePistols',
    automatics: 'sr4.AttackTypeAutomatics',
    longarms: 'sr4.AttackTypeLongarms',
    thrown: 'sr4.AttackTypeThrown',
  },
  attributeAbr: [
    'bod',
    'agi',
    'rea',
    'str',
    'wil',
    'log',
    'int',
    'cha',
    'edg',
    'ess',
    'mag',
    'res',
  ],
  /** @typedef {keyof import('@models/index').SR4SheetStats} AttributeKey */

  /** @type {{
   *  BODY: AttributeKey,
   *  CHARISMA: AttributeKey,
   *  EDGE: AttributeKey,
   *  CURRENTEDGE: AttributeKey,
   *  AGILITY: AttributeKey,
   *  INTUITION: AttributeKey,
   *  ESSENCE: AttributeKey,
   *  ASTRALINITIATIVE: AttributeKey,
   *  REACTION: AttributeKey,
   *  LOGIC: AttributeKey,
   *  INITIATIVE: AttributeKey,
   *  MATRIXINITIATIVE: AttributeKey,
   *  STRENGTH: AttributeKey,
   *  WILLPOWER: AttributeKey,
   *  MAGIC: AttributeKey,
   *  RESONANCE: AttributeKey,
   * }}
   */
  attributes: {
    BODY: 'BODY',
    CHARISMA: 'CHARISMA',
    EDGE: 'EDGE',
    CURRENTEDGE: 'CURRENTEDGE',
    AGILITY: 'AGILITY',
    INTUITION: 'INTUITION',
    ESSENCE: 'ESSENCE',
    ASTRALINITIATIVE: 'ASTRALINITIATIVE',
    REACTION: 'REACTION',
    LOGIC: 'LOGIC',
    INITIATIVE: 'INITIATIVE',
    MATRIXINITIATIVE: 'MATRIXINITIATIVE',
    STRENGTH: 'STRENGTH',
    WILLPOWER: 'WILLPOWER',
    MAGIC: 'MAGIC',
    RESONANCE: 'RESONANCE',
  },
};
