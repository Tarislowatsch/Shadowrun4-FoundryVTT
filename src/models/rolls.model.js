/**
 * @fileoverview Type definitions for the Shadowrun 4e dice rolling system.
 * These are documentation-only typedefs converted from TypeScript interfaces;
 * they produce no runtime code and are used solely for JSDoc type checking.
 */

/**
 * @typedef {object} SR4RollOptions
 * @property {number} numDice
 * @property {boolean} [explode]
 * @property {boolean} [edgeAvailable]
 * @property {import('@documents/index').SR4Actor} [actor]
 * @property {string} [skillName]
 * @property {boolean} [extended]
 * @property {boolean} [reroll]
 * @property {number} [prevSuccesses]
 */

/**
 * @typedef {object} SR4RollResult
 * @property {number} successes
 * @property {number} failures
 * @property {number[]} rolls
 */

/**
 * @typedef {object} RollParameters
 * @property {number} bonus
 * @property {number} malus
 * @property {boolean} specialization
 * @property {boolean} [smartlink]
 * @property {number} maxEdge
 * @property {boolean} explode
 * @property {boolean} edgeAvailable
 * @property {boolean} extended
 */

export {};
