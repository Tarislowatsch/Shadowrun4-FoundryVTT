/**
 * @returns {void}
 */
export function arrayHelper() {
  Handlebars.registerHelper('array', (...args) => args.slice(0, -1));
}
