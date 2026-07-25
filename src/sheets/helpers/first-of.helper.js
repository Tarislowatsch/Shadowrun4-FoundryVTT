/**
 * @returns {void}
 */
export function firstOfHelper() {
  Handlebars.registerHelper('firstOf', (...args) => {
    args.pop();
    return args.find(Boolean);
  });
}
