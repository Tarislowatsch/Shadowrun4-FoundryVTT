import { getGame } from '@utils/index';

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
 * @returns {void}
 */
export function localizeOrHelper() {
  /**
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  Handlebars.registerHelper('localizeOr', function (key, fallback) {
    if (!key || typeof key !== 'string') return fallback;
    const localized = getGame().i18n?.localize(key);
    return localized !== key ? localized : fallback;
  });
}
