/**
 * @param {string} path
 * @param {object} data
 * @returns {Promise<string>}
 */
export async function renderTemplate(path, data) {
  return foundry.applications.handlebars.renderTemplate(path, data);
}
