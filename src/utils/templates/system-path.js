export const SYSTEM_ID = 'shadowrun4e';

/**
 * @param {string} relative
 * @returns {string}
 */
export function templatePath(relative) {
  return `systems/${SYSTEM_ID}/templates/${relative}`;
}
