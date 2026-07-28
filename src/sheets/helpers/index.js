import {
  localizeHelper,
  localizeOrHelper,
  resolveItemNameHelper,
} from './localize.helper';
import { rangeHelper } from './range.helper';
import { operatorHelpers } from './operator.helpers';
import { conditionHelper } from './condition.helper';
import { includesHelper } from './includes.helper';
import { andHelper } from './and.helper';
import { orHelper } from './or.helper';
import { firstOfHelper } from './first-of.helper';
import { spellDamageTypeHelper } from './spell-damage-type.helper';
import { objectHelper } from './object.helper';
import { arrayHelper } from './array.helper';
import { moduleActiveHelper } from './module-active.helper';

/**
 * @returns {void}
 */
export function registerHelpers() {
  localizeHelper();
  rangeHelper();
  operatorHelpers();
  conditionHelper();
  localizeOrHelper();
  resolveItemNameHelper();
  includesHelper();
  andHelper();
  orHelper();
  firstOfHelper();
  spellDamageTypeHelper();
  objectHelper();
  arrayHelper();
  moduleActiveHelper();
}
