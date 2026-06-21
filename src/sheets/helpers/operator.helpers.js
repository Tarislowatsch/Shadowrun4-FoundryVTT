/**
 * @returns {void}
 */
export function operatorHelpers() {
  /**
   * @param {number} a
   * @param {number} b
   * @returns {boolean}
   */
  Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
  });

  /**
   * @param {unknown} a
   * @param {unknown} b
   * @returns {boolean}
   */
  Handlebars.registerHelper('ne', function (a, b) {
    return a !== b;
  });

  /**
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });

  /**
   * @param {number} a
   * @param {number} b
   * @returns {boolean}
   */
  Handlebars.registerHelper('gte', function (a, b) {
    return a >= b;
  });
}
