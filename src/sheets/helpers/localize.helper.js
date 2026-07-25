import { getGame } from '@utils/index';
import { resolveItemNameTranslation } from '@utils/item-name-translations.js';

/**
 * @returns {void}
 */
export function localizeHelper() {
  /**
   * @param {string} baseKey
   * @param {string} key
   * @returns {string}
   */
  Handlebars.registerHelper('localizeKey', function (baseKey, key) {
    return getGame().i18n?.localize(`${baseKey}.${key}`) ?? `${baseKey}.${key}`;
  });
}

/**
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function resolveLocalizedOrTranslated(key, fallback) {
  if (!key || typeof key !== 'string') return fallback;
  const localized = getGame().i18n?.localize(key);
  if (localized !== key) return localized;
  return resolveItemNameTranslation(key, getGame().i18n?.lang) ?? fallback;
}

/**
 * @returns {void}
 */
export function localizeOrHelper() {
  /**
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  Handlebars.registerHelper('localizeOr', function (key, fallback) {
    return resolveLocalizedOrTranslated(key, fallback);
  });
}

/**
 * Item-name-specific: resolves a dictionary/static-i18n name like
 * `localizeOr`, unless the item carries a GM/player-authored custom name,
 * in which case that raw name wins outright with no lookup at all.
 *
 * @returns {void}
 */
export function resolveItemNameHelper() {
  /**
   * @param {string} label
   * @param {string} name
   * @param {boolean} [hasCustomName]
   * @returns {string}
   */
  Handlebars.registerHelper(
    'resolveItemName',
    function (label, name, hasCustomName) {
      if (hasCustomName === true) return name;
      return resolveLocalizedOrTranslated(label, name);
    }
  );
}
