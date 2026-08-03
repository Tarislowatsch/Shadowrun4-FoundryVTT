import { SYSTEM_ID } from '../../src/utils/game/system-id.js';

const VALID_FLAG_SCOPES = ['core', 'world', SYSTEM_ID];

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return (
    typeof value === 'object' && value !== null && value.constructor === Object
  );
}

/**
 * @param {object} target
 * @param {object} data
 * @returns {void}
 */
export function applyFoundryUpdate(target, data) {
  for (const [path, value] of Object.entries(data)) {
    const keys = path.split('.');
    let obj = target;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] ??= {};
      obj = obj[keys[i]];
    }
    const key = keys[keys.length - 1];
    if (isPlainObject(obj[key]) && isPlainObject(value)) {
      applyFoundryUpdate(obj[key], value);
    } else {
      obj[key] = value;
    }
  }
}

/**
 * @param {string} scope
 * @returns {void}
 */
function assertFlagScope(scope) {
  if (!VALID_FLAG_SCOPES.includes(scope)) {
    throw new Error(
      `Flag scope "${scope}" is not valid or not currently active`
    );
  }
}

/**
 * @template {{ flags?: object, update?: Function }} T
 * @param {T} document
 * @returns {T}
 */
export function withFlagApi(document) {
  document.flags ??= {};
  document.getFlag = (scope, key) => {
    assertFlagScope(scope);
    return document.flags?.[scope]?.[key];
  };
  document.setFlag = (scope, key, value) => {
    assertFlagScope(scope);
    const data = { flags: { [scope]: { [key]: value } } };
    if (document.update) return document.update(data);
    applyFoundryUpdate(document, data);
    return Promise.resolve(document);
  };
  return document;
}
