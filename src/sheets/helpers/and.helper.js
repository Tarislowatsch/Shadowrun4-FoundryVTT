/**
 * @returns {void}
 */
export function andHelper() {
  Handlebars.registerHelper('and', (a, b) => a && b);
}
