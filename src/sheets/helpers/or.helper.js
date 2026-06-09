export function orHelper() {
  Handlebars.registerHelper('or', (...args) => {
    args.pop(); // Handlebars options object entfernen
    return args.some(Boolean);
  });
}
