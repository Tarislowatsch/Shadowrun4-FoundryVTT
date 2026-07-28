import { lower } from '../mappers/helpers.js';

/**
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeLangCode(input) {
  return lower(input) || null;
}

/**
 * @param {string} fileName
 * @returns {string | null}
 */
export function detectLanguageFromFilename(fileName) {
  const match = String(fileName ?? '').match(/^([a-z]{2})(?:[_.-]|$)/i);
  return match ? normalizeLangCode(match[1]) : null;
}
