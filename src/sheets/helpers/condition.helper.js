/**
 * Registers custom Handlebars helpers used for rendering condition monitors
 * and other index-based UI elements on Shadowrun 4e character sheets.
 *
 * @returns {void}
 */
export function conditionHelper() {
  /**
   * Handlebars helper `filledIf`.
   * Returns the string `'filled'` when the current value exceeds the given index,
   * allowing templates to conditionally apply a CSS class to condition monitor boxes.
   *
   * @example
   * // In a Handlebars template:
   * // {{filledIf currentDamage @index}}
   *
   * @param {number} current - The current value (e.g. damage taken).
   * @param {number} index - The box index being evaluated (zero-based).
   * @returns {string} `'filled'` if current > index, otherwise an empty string.
   */
  Handlebars.registerHelper('filledIf', function (current, index) {
    return current > index ? 'filled' : '';
  });
}
