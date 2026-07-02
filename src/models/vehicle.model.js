/**
 * @fileoverview Type definitions for Shadowrun 4e vehicle data models.
 * These are documentation-only typedefs converted from TypeScript interfaces;
 * they produce no runtime code and are used solely for JSDoc type checking.
 */

/**
 * @typedef {object} SR4VehicleMods
 * @property {number} cost
 * @property {string} availability
 * @property {string} legality
 * @property {string} description
 * @property {number} [rating]
 * @property {string} type
 */

/**
 * @typedef {object} SR4VehicleWeapon
 * @property {string} name
 * @property {string} type
 * @property {object} data
 * @property {string} data.description
 * @property {number} data.cost
 * @property {string} data.availability
 * @property {string} data.legality
 * @property {string} data.damage
 * @property {string} data.ap
 * @property {string} data.mode
 * @property {string} data.rc
 * @property {string} data.ammo
 * @property {string[]} data.mods
 */

/**
 * @typedef {object} SR4VehicleModel
 * @property {string} name
 * @property {string} type
 * @property {object} data
 * @property {string} data.description
 * @property {number} data.cost
 * @property {string} data.availability
 * @property {string} data.legality
 * @property {number} data.body
 * @property {number} data.speed
 * @property {number} data.acceleration
 * @property {number} data.pilot
 * @property {number} data.sensor
 * @property {number} data.handling
 * @property {number} data.armor
 * @property {SR4VehicleMods[]} data.mods
 * @property {SR4VehicleWeapon[]} data.weapons
 * @property {string} data.owner
 */
