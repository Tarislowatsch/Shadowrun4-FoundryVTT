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
 * The outcome of a single Shadowrun 4e dice pool roll.
 *
 * @typedef {object} SR4RollResult
 * @property {number} successes - Number of dice showing 5 or 6.
 * @property {number} failures - Number of dice showing 1 (glitch dice).
 * @property {number[]} rolls - Raw die values for every die in the pool.
 */

/**
 * Parameters used to configure a dice pool roll, typically gathered from
 * a roll dialog before the roll is executed.
 *
 * @typedef {object} RollParameters
 * @property {number} bonus - Flat bonus dice added to the pool.
 * @property {number} malus - Flat penalty dice subtracted from the pool.
 * @property {boolean} specialization - Whether the character's specialization applies (+2 dice).
 * @property {boolean} [smartlink] - Whether a smartlink bonus is active.
 * @property {number} maxEdge - The actor's maximum Edge attribute value.
 * @property {boolean} explode - Whether dice should explode (re-roll) on a result of 6.
 * @property {boolean} edgeAvailable - Whether the actor currently has Edge to spend.
 * @property {boolean} extended - Whether this roll is part of an extended test.
 */

export {};
