export function includesHelper() {
  Handlebars.registerHelper('includes', (array, value) =>
    array?.includes(value)
  );
}
