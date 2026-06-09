/**
 * Registers arithmetic and comparison Handlebars helpers used throughout
 * the Shadowrun 4e sheet templates.
 *
 * Registered helpers:
 * - `eq`  — strict equality (`a === b`)
 * - `add` — addition (`a + b`)
 * - `gte` — greater-than-or-equal (`a >= b`)
 *
 * @returns {void}
 */
export function operatorHelpers() {
  /**
   * Handlebars helper `eq`.
   * Returns `true` when both operands are strictly equal.
   *
   * @example
   * // {{#if (eq selectedTab "skills")}}...{{/if}}
   *
   * @param {number} a - Left-hand operand.
   * @param {number} b - Right-hand operand.
   * @returns {boolean} `true` if `a === b`, otherwise `false`.
   */
  Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
  });

  /**
   * Handlebars helper `add`.
   * Returns the sum of two numbers.
   *
   * @example
   * // {{add cost modifier}}
   *
   * @param {number} a - First addend.
   * @param {number} b - Second addend.
   * @returns {number} The sum `a + b`.
   */
  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });

  /**
   * Handlebars helper `gte`.
   * Returns `true` when the first operand is greater than or equal to the second.
   *
   * @example
   * // {{#if (gte currentRating maxRating)}}...{{/if}}
   *
   * @param {number} a - Left-hand operand.
   * @param {number} b - Right-hand operand.
   * @returns {boolean} `true` if `a >= b`, otherwise `false`.
   */
  Handlebars.registerHelper('gte', function (a, b) {
    return a >= b;
  });
}
