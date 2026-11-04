import { SYSTEM_ID } from '../game/system-id.js';

/**
 * @param {string} relative
 * @returns {string}
 */
export function templatePath(relative) {
  return `systems/${SYSTEM_ID}/templates/${relative}`;
}
