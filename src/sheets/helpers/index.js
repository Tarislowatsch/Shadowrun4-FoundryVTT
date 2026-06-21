import { localizeHelper, localizeOrHelper } from './localize.helper';
import { rangeHelper } from './range.helper';
import { operatorHelpers } from './operator.helpers';
import { conditionHelper } from './condition.helper';
import { includesHelper } from './includes.helper';
import { andHelper } from './and.helper';
import { orHelper } from './or.helper';

/**
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
