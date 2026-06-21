import { SR4 } from '../../config.js';

/** @typedef {import('@models/index').SR4RollResult} SR4RollResult */
/** @typedef {import('@models/index').SR4RollOptions} SR4RollOptions */

const ROLL_RESULTS_TEMPLATE =
  'systems/shadowrun4e/templates/dicerolls/roll-results.hbs';

// ---------------------------------------------------------------------------
// Pure evaluation helpers (no Foundry side-effects)
// ---------------------------------------------------------------------------

/** @param {number} value @returns {{ isSuccess: boolean, isFailure: boolean }} */
export function evaluateDie(value) {
  return {
    isSuccess: value >= SR4.rules.successThreshold,
    isFailure: value === 1,
  };
}

/** @param {{ failures: number, rolls: number[] }} results @param {boolean} [reroll] */
export function isGlitch(results, reroll = false) {
  return results.failures >= results.rolls.length / 2 && !reroll;
}

/** @param {{ successes: number, failures: number, rolls: number[] }} results @param {boolean} [reroll] */
export function isCriticalGlitch(results, reroll = false) {
  return isGlitch(results, reroll) && results.successes === 0;
}

/** @param {{ numDice: number, explode?: boolean }} options @returns {string} */
export function buildRollFormula(options) {
  let formula = `${options.numDice}d6`;
  if (options.explode) formula += 'x';
  formula += `cs>=${SR4.rules.successThreshold}`;
  return formula;
}

export class DiceUtility {
  // ---------------------------------------------------------------------------
  // Roll execution
  // ---------------------------------------------------------------------------

  /**
   * @param {SR4RollOptions} options
   * @returns {Promise<{successes: number, isGlitch: boolean, messageId: string | null}>} The roll outcome and the created chat message id.
   */
  static async rollAndShow(options) {
    options.numDice = Math.max(1, options.numDice);

    const roll = await new Roll(buildRollFormula(options)).roll();

    const { successes, failures, rolls } = DiceUtility.determineSuccess(roll);

    const messageId = await this.showResults({
      successes,
      failures,
      rolls,
      roll,
      options: { ...options, reroll: false },
    });

    return { successes, isGlitch: isGlitch({ failures, rolls }), messageId };
  }

  /**
   * @param {SR4RollOptions} options
   * @returns {Promise<number>}
   */
  static async followUpRoll(options) {
    const roll = await new Roll(buildRollFormula(options)).roll();
    const { successes, failures, rolls } = DiceUtility.determineSuccess(roll);
    if (options.explode && options.actor) {
      await options.actor.useEdge();
    }
    const totalSuccesses = successes + (options.prevSuccesses ?? 0);
    await this.showResults({
      successes: totalSuccesses,
      failures,
      rolls,
      roll,
      options: {
        ...options,
        numDice: rolls.length,
      },
    });
    return totalSuccesses;
  }

  /**
   * @param {boolean} edgeUsed
   * @param {number} numDice
   * @returns {Promise<{successes: number, isGlitch: boolean}>}
   */
  static async rollInitiative(edgeUsed, numDice) {
    if (edgeUsed)
      return { successes: SR4.rules.edgeInitiativeSentinel, isGlitch: false };
    return this.rollAndShow({ numDice });
  }

  // ---------------------------------------------------------------------------
  // Roll formula & result evaluation (delegates to free functions)
  // ---------------------------------------------------------------------------

  /** @param {Roll} roll @returns {SR4RollResult} */
  static determineSuccess(roll) {
    let successes = 0;
    let failures = 0;
    /** @type {number[]} */
    const rolls = [];
    for (const result of roll.terms[0].results) {
      const value = result.result;
      const { isSuccess, isFailure } = evaluateDie(value);
      rolls.push(value);
      successes += isSuccess ? 1 : 0;
      failures += isFailure ? 1 : 0;
    }
    return { successes, failures, rolls };
  }

  // ---------------------------------------------------------------------------
  // Chat output
  // ---------------------------------------------------------------------------

  /**
   * @param {{ successes: number, failures: number, rolls: number[], roll: Roll, options: SR4RollOptions }} data
   * @returns {Promise<string | null>} the created chat message id, or null on failure.
   */
  static async showResults(data) {
    const { successes, failures, rolls, roll, options } = data;
    const { edgeAvailable, reroll, actor, skillName, extended } = options;

    const glitch = isGlitch({ failures, rolls }, reroll);
    const critGlitch = glitch && successes === 0;

    const templateData = {
      successes,
      failures,
      isCriticalGlitch: critGlitch,
      isGlitch: glitch,
      showCombined: reroll || extended,
      actorName: actor?.name,
      skillName,
    };

    let targetId = /** @type {string|null} */ (null);
    let hookId = /** @type {number|undefined} */ (undefined);

    try {
      const content = await foundry.applications.handlebars.renderTemplate(
        ROLL_RESULTS_TEMPLATE,
        templateData
      );

      hookId = Hooks.once('renderChatMessageHTML', (chatMessage, html) => {
        if (chatMessage.id !== targetId) return;
        html.querySelector('.dice-total').textContent = String(successes);
      });

      const message = await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: content,
        flags: {
          sr4: {
            actorId: actor?.id ?? null,
            edgeAvailable: edgeAvailable ?? false,
            extended: extended ?? false,
            reroll: reroll ?? false,
            isCriticalGlitch: critGlitch,
            isGlitch: glitch,
            successes,
            rolledDice: rolls.length,
            options,
          },
        },
      });

      if (!message) {
        Hooks.off('renderChatMessageHTML', hookId);
        return null;
      }
      targetId = message.id;
      return message.id;
    } catch (err) {
      if (hookId !== undefined) Hooks.off('renderChatMessageHTML', hookId);
      console.error('Roll rendering failed:', err);
      return null;
    }
  }
}
