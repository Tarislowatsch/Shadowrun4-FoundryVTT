/**
 * @returns {void}
 */
export function objectHelper() {
  Handlebars.registerHelper('object', (options) => options.hash);
}
