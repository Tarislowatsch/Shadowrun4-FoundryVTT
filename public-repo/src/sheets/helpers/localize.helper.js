import { getGame } from '@utils/index';

/**
 * Registers the `localizeKey` Handlebars helper.
 * Combines a base i18n key and a sub-key into a dotted path and resolves it
 * via Foundry's localisation API, falling back to the raw key string if
 * the translation is unavailable.
 *
 * @example
 * // In a Handlebars template:
 * // {{localizeKey "SR4.Attributes" "body"}}
 * // → game.i18n.localize("SR4.Attributes.body") or "SR4.Attributes.body"
 *
 * @returns {void}
 */
export function localizeHelper() {
  /**
   * @param {string} baseKey - The root portion of the i18n key (e.g. `"SR4.Attributes"`).
   * @param {string} key - The sub-key to append (e.g. `"body"`).
   * @returns {string} The localised string, or `"baseKey.key"` if not found.
   */
  Handlebars.registerHelper('localizeKey', function (baseKey, key) {
    return getGame().i18n?.localize(`${baseKey}.${key}`) ?? `${baseKey}.${key}`;
  });
}

/**
 * Registers the `localizeOr` Handlebars helper.
 * Attempts to localise the given i18n key and returns the result only when a
 * real translation exists. If the key is missing, empty, not a string, or
 * Foundry returns the key unchanged (i.e. no translation found), the provided
 * fallback value is returned instead.
 *
 * @example
 * // In a Handlebars template:
 * // {{localizeOr "SR4.WeaponType.custom" item.type}}
 * // → translated string if key exists, otherwise item.type
 *
 * @returns {void}
 */
export function localizeOrHelper() {
  /**
   * @param {string} key - The i18n key to look up.
   * @param {string} fallback - The value to return when no translation is found.
   * @returns {string} The localised string if found, otherwise `fallback`.
   */
  Handlebars.registerHelper('localizeOr', function (key, fallback) {
    if (!key || typeof key !== 'string') return fallback;
    const localized = getGame().i18n?.localize(key);
    return localized !== key ? localized : fallback;
  });
}
