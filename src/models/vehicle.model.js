/**
 * @fileoverview Type definitions for Shadowrun 4e vehicle data models.
 * These are documentation-only typedefs converted from TypeScript interfaces;
 * they produce no runtime code and are used solely for JSDoc type checking.
 */

/**
 * Represents a vehicle mod that can be installed on an SR4 vehicle.
 *
 * @typedef {object} SR4VehicleMods
 * @property {number} cost - Purchase cost of the mod in nuyen.
 * @property {string} availability - Availability rating (e.g. "12F").
 * @property {string} legality - Legality code (e.g. "Forbidden", "Restricted").
 * @property {string} description - Human-readable description of the mod.
 * @property {number} [rating] - Optional rating value for rated mods.
 * @property {string} type - Category or type of the mod.
 */

/**
 * Represents a weapon mounted on an SR4 vehicle.
 *
 * @typedef {object} SR4VehicleWeapon
 * @property {string} name - Display name of the weapon.
 * @property {string} type - Weapon type identifier.
 * @property {object} data - The weapon's system data.
 * @property {string} data.description - Human-readable description.
 * @property {number} data.cost - Purchase cost in nuyen.
 * @property {string} data.availability - Availability rating.
 * @property {string} data.legality - Legality code.
 * @property {string} data.damage - Damage code (e.g. "10P").
 * @property {string} data.ap - Armour Penetration value.
 * @property {string} data.mode - Fire mode(s) (e.g. "SA/BF").
 * @property {string} data.rc - Recoil Compensation value.
 * @property {string} data.ammo - Ammo type and capacity.
 * @property {string[]} data.mods - List of installed weapon mod names.
 */

/**
 * Represents the full data model for a Shadowrun 4e vehicle item document.
 * Extends the Foundry VTT `ItemData` base type.
 *
 * @typedef {object} SR4VehicleModel
 * @property {string} name - Display name of the vehicle.
 * @property {string} type - Document type identifier (should be `"Vehicle"`).
 * @property {object} data - The vehicle's system data.
 * @property {string} data.description - Human-readable description.
 * @property {number} data.cost - Purchase cost in nuyen.
 * @property {string} data.availability - Availability rating.
 * @property {string} data.legality - Legality code.
 * @property {number} data.body - Body attribute value.
 * @property {number} data.speed - Speed attribute value.
 * @property {number} data.acceleration - Acceleration attribute value.
 * @property {number} data.pilot - Pilot rating (used for autonomous operation).
 * @property {number} data.sensor - Sensor rating.
 * @property {number} data.seats - Number of passenger seats.
 * @property {number} data.handling - Handling attribute value.
 * @property {number} data.armor - Armour rating.
 * @property {SR4VehicleMods[]} data.mods - List of installed vehicle mods.
 * @property {SR4VehicleWeapon[]} data.weapons - List of mounted vehicle weapons.
 * @property {string} data.owner - Name or ID of the vehicle's owner.
 */
