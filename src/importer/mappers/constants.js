import {
  WeaponCategory,
  Attackskill,
  DamageTypes,
} from '@models/items/weapon.enums.js';
import { SR4Attributes } from '@models/attribute.enum.js';

/**
 * @param {Record<string, string>} enumObj
 * @returns {Record<string, string>}
 */
function keyMap(enumObj) {
  return Object.fromEntries(Object.keys(enumObj).map((k) => [k, k]));
}

const wc = keyMap(WeaponCategory);
const as = keyMap(Attackskill);
export const dt = keyMap(DamageTypes);
const attr = keyMap(SR4Attributes);

/**
 * @type {Record<string, string>}
 */
export const CATEGORY_TO_ATTACKSKILL = {
  Blades: as.BLADES,
  Clubs: as.CLUBS,
  'Exotic Melee Weapons': as.EXOTIC_MELEE,
  'Exotic Ranged Weapons': as.EXOTIC_RANGED,
  Unarmed: as.UNARMED,
  Bows: as.ARCHERY,
  Crossbows: as.ARCHERY,
  'Throwing Weapons': as.THROWING,
  Tasers: as.PISTOLS,
  Holdouts: as.PISTOLS,
  'Light Pistols': as.PISTOLS,
  'Heavy Pistols': as.PISTOLS,
  'Machine Pistols': as.AUTOMATICS,
  'Submachine Guns': as.AUTOMATICS,
  'Assault Rifles': as.AUTOMATICS,
  'Battle Rifles': as.LONGARMS,
  'Sports Rifles': as.LONGARMS,
  'Sniper Rifles': as.LONGARMS,
  Shotguns: as.LONGARMS,
  'Special Weapons': as.HEAVY_WEAPONS,
  'Light Machine Guns': as.HEAVY_WEAPONS,
  'Medium Machine Guns': as.HEAVY_WEAPONS,
  'Heavy Machine Guns': as.HEAVY_WEAPONS,
  'Assault Cannons': as.HEAVY_WEAPONS,
  Flamethrowers: as.HEAVY_WEAPONS,
  'Laser Weapons': as.HEAVY_WEAPONS,
  'Grenade Launchers': as.HEAVY_WEAPONS,
  'Mortar Launchers': as.HEAVY_WEAPONS,
  'Missile Launchers': as.HEAVY_WEAPONS,
  'Vehicle Weapons': as.HEAVY_WEAPONS,
};

/**
 * @type {Record<string, string>}
 */
export const XML_CATEGORY_TO_ENUM = {
  Blades: wc.BLADES,
  Clubs: wc.CLUBS,
  'Exotic Melee Weapons': wc.EXOTIC_MELEE_WEAPONS,
  'Exotic Ranged Weapons': wc.EXOTIC_RANGED_WEAPONS,
  Unarmed: wc.UNARMED,
  Bows: wc.BOWS,
  Crossbows: wc.CROSSBOWS,
  'Throwing Weapons': wc.THROWING_WEAPONS,
  Tasers: wc.TASERS,
  Holdouts: wc.HOLDOUTS,
  'Light Pistols': wc.LIGHT_PISTOLS,
  'Heavy Pistols': wc.HEAVY_PISTOLS,
  'Machine Pistols': wc.MACHINE_PISTOLS,
  'Submachine Guns': wc.SUBMACHINE_GUNS,
  'Assault Rifles': wc.ASSAULT_RIFLES,
  'Battle Rifles': wc.BATTLE_RIFLES,
  'Sports Rifles': wc.SPORTS_RIFLES,
  'Sniper Rifles': wc.SNIPER_RIFLES,
  Shotguns: wc.SHOTGUNS,
  'Special Weapons': wc.SPECIAL_WEAPONS,
  'Light Machine Guns': wc.LIGHT_MACHINE_GUNS,
  'Medium Machine Guns': wc.MEDIUM_MACHINE_GUNS,
  'Heavy Machine Guns': wc.HEAVY_MACHINE_GUNS,
  'Assault Cannons': wc.ASSAULT_CANNONS,
  Flamethrowers: wc.FLAMETHROWERS,
  'Laser Weapons': wc.LASER_WEAPONS,
  'Grenade Launchers': wc.GRENADE_LAUNCHERS,
  'Mortar Launchers': wc.MORTAR_LAUNCHERS,
  'Missile Launchers': wc.MISSILE_LAUNCHERS,
  'Vehicle Weapons': wc.VEHICLE_WEAPONS,
  Gear: wc.GEAR,
  'Underbarrel Weapons': wc.UNDERBARREL_WEAPONS,
  Cyberware: wc.CYBERWARE,
};

/**
 * @type {Record<string, string>}
 */
export const ATTRIBUTE_ABBR_TO_KEY = {
  BOD: attr.BODY,
  AGI: attr.AGILITY,
  REA: attr.REACTION,
  STR: attr.STRENGTH,
  WIL: attr.WILLPOWER,
  LOG: attr.LOGIC,
  INT: attr.INTUITION,
  CHA: attr.CHARISMA,
  EDG: attr.EDGE,
  ESS: attr.ESSENCE,
  MAG: attr.MAGIC,
  RES: attr.RESONANCE,
};

/** @type {Array<[string, string]>} [xmlPrefix, attrKey] */
export const ATTRIBUTE_MAP = [
  ['bod', 'body'],
  ['agi', 'agility'],
  ['rea', 'reaction'],
  ['str', 'strength'],
  ['cha', 'charisma'],
  ['int', 'intuition'],
  ['log', 'logic'],
  ['wil', 'willpower'],
  ['ini', 'initiative'],
  ['edg', 'edge'],
  ['mag', 'magic'],
  ['res', 'resonance'],
  ['ess', 'essence'],
];

/** @type {Set<string>} */
export const FORCE_SPIRIT_CATEGORIES = new Set([
  'Spirits',
  'Toxic Spirits',
  'Insect Spirits',
  'Shadow Spirits',
  'Primordial Spirits',
  'Fey',
  'Ghosts and Haunts',
  'Harbingers',
  'Shedim',
  'Imps',
]);

/** @type {Set<string>} */
export const FORCE_SPRITE_CATEGORIES = new Set([
  'Sprites',
  'Entropic Sprites',
  'Technocritters',
  'Protosapients',
  'A.I.s',
]);

/** @type {Set<string>} */
export const FIXED_CRITTER_CATEGORIES = new Set([
  'Mundane Critters',
  'Paranormal Critters',
  'Dracoforms',
  'Infected',
  'Mutant Critters',
  'Toxic Critters',
]);

/** @type {Set<string>} */
export const ALL_CRITTER_CATEGORIES = new Set([
  ...FORCE_SPIRIT_CATEGORIES,
  ...FORCE_SPRITE_CATEGORIES,
  ...FIXED_CRITTER_CATEGORIES,
]);

/**
 * @param {string} category
 * @returns {'npc'|'spirit'|'sprite'}
 */
export function critterActorType(category) {
  if (FORCE_SPIRIT_CATEGORIES.has(category)) return 'spirit';
  if (FORCE_SPRITE_CATEGORIES.has(category)) return 'sprite';
  return 'npc';
}
