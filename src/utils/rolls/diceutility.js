import { SR4 } from '../../config.js';

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
   * Rolls a dice pool and displays the result in chat.
   *
   * @param {import('@models/index').SR4RollOptions} options
   * @returns {Promise<{successes: number, isGlitch: boolean}>} The number of successes.
   */
  static async rollAndShow(options) {
    options.numDice = Math.max(1, options.numDice);

    const roll = await new Roll(this.rollFormula(options)).roll();

    const { successes, failures, rolls } = DiceUtility.determineSuccess(roll);
    const isGlitch = failures >= successes;

    this.showResults({
      successes,
      failures,
      rolls,
      roll,
      options: { ...options, reroll: false },
    });

    return { successes, isGlitch };
  }

  /**
   * Rolls additional dice for a follow-up (reroll or extended test) and
   * displays the result in chat, accumulating previous successes.
   *
   * @param {import('@models/index').SR4RollOptions} options
   * @returns {Promise<number>}
   */
  static async followUpRoll(options) {
    const roll = await new Roll(this.rollFormula(options)).roll();
    const { successes, failures, rolls } = DiceUtility.determineSuccess(roll);
    if (options.explode && options.actor) {
      options.actor.useEdge();
    }
    const totalSuccesses = successes + (options.prevSuccesses ?? 0);
    this.showResults({
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
   * Returns the initiative value for an actor, or 99 if Edge was used.
   *
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

  /** @param {import('@models/index').SR4RollOptions} options @returns {string} */
  static rollFormula(options) {
    return buildRollFormula(options);
  }

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

  /** @param {number} roll */
  static getResults(roll) {
    return evaluateDie(roll);
  }

  /** @param {SR4RollResult} results @param {boolean} [reroll] */
  static glitchCheck(results, reroll = false) {
    return isGlitch(results, reroll);
  }

  /** @param {SR4RollResult} results @param {boolean} [reroll] */
  static criticalGlitchCheck(results, reroll = false) {
    return isCriticalGlitch(results, reroll);
  }

  // ---------------------------------------------------------------------------
  // Chat output
  // ---------------------------------------------------------------------------

  /**
   * Renders the roll result to chat.
   * Buttons are NOT baked into the flavor HTML — they are injected per-client
   * via renderChatMessageHTML in dice-chat-hooks.js so that only the owning
   * user sees them.
   *
   * @param {{ successes: number, failures: number, rolls: number[], roll: Roll, options: SR4RollOptions }} data
   * @returns {Promise<void>}
   */
  static async showResults(data) {
    const { successes, failures, rolls, roll, options } = data;
    const { edgeAvailable, reroll, actor, skillName, extended } = options;

    const isCriticalGlitch = this.criticalGlitchCheck(
      { successes, failures, rolls },
      reroll
    );
    const isGlitch = this.glitchCheck({ successes, failures, rolls }, reroll);

    const templateData = {
      successes,
      failures,
      isCriticalGlitch,
      isGlitch,
      showCombined: reroll || extended,
      actorName: actor?.name,
      skillName,
    };

    try {
      const content = await foundry.applications.handlebars.renderTemplate(
        ROLL_RESULTS_TEMPLATE,
        templateData
      );

      const message = await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: content,
        flags: {
          sr4: {
            actorId: actor?.id ?? null,
            edgeAvailable: edgeAvailable ?? false,
            extended: extended ?? false,
            reroll: reroll ?? false,
            isCriticalGlitch,
            isGlitch,
            successes,
            rolledDice: rolls.length,
            options,
          },
        },
      });

      if (!message) return;

      this.mutateChatHook(successes, message.id);
    } catch (err) {
      console.error('Roll rendering failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Registers a one-time hook to overwrite the Foundry dice total display with
   * the SR4 success count for a specific chat message.
   *
   * @param {number} successes
   * @param {string | null} messageId
   * @returns {void}
   */
  static mutateChatHook(successes, messageId) {
    Hooks.once('renderChatMessageHTML', (chatMessage, html) => {
      if (chatMessage.id !== messageId) return;
      html.querySelector('.dice-total').textContent = String(successes);
    });
  }
}
