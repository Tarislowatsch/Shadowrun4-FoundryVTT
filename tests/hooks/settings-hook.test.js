import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const LANG_FILE = path.join(process.cwd(), 'src', 'lang', 'en.settings.json');

let SettingsHook;
let FLOW_KEYS;
let getItemNameTranslations;

/** @type {Map<string, object>} */
let settings;
/** @type {Map<string, object>} */
let menus;
/** @type {Map<string, unknown>} */
let values;
/** @type {Function | undefined} */
let updateSettingHandler;

/**
 * @param {object} node
 * @param {string} [prefix]
 * @returns {string[]}
 */
function flattenKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? flattenKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

beforeAll(async () => {
  globalThis.foundry.applications = {
    api: {
      HandlebarsApplicationMixin: (Base) => class extends Base {},
      ApplicationV2: class {},
    },
  };
  ({ SettingsHook } = await import('../../src/hooks/settings-hook.js'));
  ({ FLOW_KEYS } = await import(
    '../../src/sheets/settings/flow-settings-menu.js'
  ));
  ({ getItemNameTranslations } = await import(
    '../../src/utils/item-name-translations.js'
  ));
});

beforeEach(() => {
  settings = new Map();
  menus = new Map();
  values = new Map();
  updateSettingHandler = undefined;
  globalThis.Hooks = {
    once: (event, callback) => {
      if (event === 'init') callback();
    },
    on: (event, handler) => {
      if (event === 'updateSetting') updateSettingHandler = handler;
    },
  };
  globalThis.game.settings = {
    register: (_namespace, key, config) => {
      expect(settings.has(key), `duplicate setting ${key}`).toBe(false);
      settings.set(key, config);
    },
    registerMenu: (_namespace, key, config) => {
      expect(menus.has(key), `duplicate menu ${key}`).toBe(false);
      menus.set(key, config);
    },
    get: (_namespace, key) => values.get(key),
    set: vi.fn(),
  };
  new SettingsHook();
});

describe('SettingsHook', () => {
  it('has an English entry for every name, hint and label', () => {
    const en = new Set(
      flattenKeys(JSON.parse(fs.readFileSync(LANG_FILE, 'utf8')))
    );
    const missing = [...settings, ...menus].flatMap(([key, config]) =>
      ['name', 'hint', 'label']
        .filter((field) => config[field] && !en.has(config[field]))
        .map((field) => `${key}.${field}: ${config[field]}`)
    );

    expect(missing).toEqual([]);
  });

  it('registers every flow menu key as a hidden setting', () => {
    const broken = FLOW_KEYS.filter(
      (key) => settings.get(key)?.config !== false
    );

    expect(broken).toEqual([]);
  });

  it('gives every visible setting a name and hint', () => {
    const unnamed = [...settings]
      .filter(([, config]) => config.config && !(config.name && config.hint))
      .map(([key]) => key);

    expect(unnamed).toEqual([]);
  });

  it('disables the soak workflow when the defense workflow is turned off', () => {
    const { onChange } = settings.get('combatDefenseWorkflow');

    onChange(true);
    expect(game.settings.set).not.toHaveBeenCalled();

    onChange(false);
    expect(game.settings.set).toHaveBeenCalledWith(
      'shadowrun4e',
      'combatSoakWorkflow',
      false
    );
  });

  it('invalidates the item name translation cache when the setting changes', () => {
    const dictionary = (en) =>
      JSON.stringify({ _version: 1, labels: { knife: { en } } });
    values.set('itemNameTranslations', dictionary('Knife'));
    updateSettingHandler({ key: 'shadowrun4e.itemNameTranslations' });
    expect(getItemNameTranslations().knife.en).toBe('Knife');

    values.set('itemNameTranslations', dictionary('Combat Knife'));
    updateSettingHandler({ key: 'shadowrun4e.otherSetting' });
    expect(getItemNameTranslations().knife.en).toBe('Knife');

    updateSettingHandler({ key: 'shadowrun4e.itemNameTranslations' });
    expect(getItemNameTranslations().knife.en).toBe('Combat Knife');
  });
});
