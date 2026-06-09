import { localizeHelper, localizeOrHelper } from './localize.helper';
import { rangeHelper } from './range.helper';
import { operatorHelpers } from './operator.helpers';
import { conditionHelper } from './condition.helper';
import { includesHelper } from './includes.helper';
import { andHelper } from './and.helper';
import { orHelper } from './or.helper';

/**
 * Registers all custom Handlebars helpers used throughout the Shadowrun 4e system.
 * Should be called once during system initialisation before any sheets are rendered.
 *
 * Registered helper modules:
 * - {@link notHelper} — logical negation helper
 * - {@link localizeHelper} — i18n localisation helper
 * - {@link localizeOrHelper} — i18n localisation with fallback helper
 * - {@link rangeHelper} — numeric range iteration helper
 * - {@link operatorHelpers} — comparison and arithmetic operator helpers
 * - {@link conditionHelper} — condition monitor / index-based CSS class helper
 *
 * @returns {void}
 */
export function registerHelpers() {
  localizeHelper();
  rangeHelper();
  operatorHelpers();
  conditionHelper();
  localizeOrHelper();
  includesHelper();
  andHelper();
  orHelper();
}
