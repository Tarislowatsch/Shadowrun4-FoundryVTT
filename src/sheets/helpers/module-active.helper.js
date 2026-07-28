/**
 * @returns {void}
 */
export function moduleActiveHelper() {
  Handlebars.registerHelper(
    'isModuleActive',
    (moduleId) => !!game.modules.get(moduleId)?.active
  );
}
