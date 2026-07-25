import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  localizeOrHelper,
  resolveItemNameHelper,
} from '@sheets/helpers/localize.helper.js';
import {
  invalidateItemNameTranslationsCache,
  registerItemNameTranslations,
} from '@utils/item-name-translations.js';

describe('localizeOr helper', () => {
  let registered;
  let settingStore;
  const originalI18n = game.i18n;

  beforeEach(async () => {
    registered = {};
    globalThis.Handlebars = {
      registerHelper: (name, fn) => (registered[name] = fn),
    };
    settingStore = '{}';
    game.settings = {
      get: () => settingStore,
      set: async (_scope, _key, value) => {
        settingStore = value;
      },
    };
    invalidateItemNameTranslationsCache();
    localizeOrHelper();
    resolveItemNameHelper();
    await registerItemNameTranslations([
      {
        label: 'ares_predator_iv',
        translations: { en: 'Ares Predator IV', de: 'Ares Predator IV' },
      },
    ]);
  });

  afterEach(() => {
    game.i18n = originalI18n;
    delete game.settings;
  });

  it('resolves a static i18n key hit unchanged (Skill path)', () => {
    game.i18n = {
      localize: (key) => (key === 'sr4.skills.archery' ? 'Archery' : key),
      lang: 'en',
    };
    expect(registered.localizeOr('sr4.skills.archery', 'fallback')).toBe(
      'Archery'
    );
  });

  it('falls through to the dictionary for the current client language when the static key misses', () => {
    game.i18n = { localize: (key) => key, lang: 'de' };
    expect(registered.localizeOr('ares_predator_iv', 'Ares Predator IV')).toBe(
      'Ares Predator IV'
    );
  });

  it('resolves differently for two different client languages against the same dictionary', async () => {
    settingStore = '{}';
    invalidateItemNameTranslationsCache();
    await registerItemNameTranslations([
      { label: 'clothing', translations: { en: 'Clothing', de: 'Kleidung' } },
    ]);

    game.i18n = { localize: (key) => key, lang: 'de' };
    expect(registered.localizeOr('clothing', 'Clothing')).toBe('Kleidung');

    game.i18n = { localize: (key) => key, lang: 'en' };
    expect(registered.localizeOr('clothing', 'Clothing')).toBe('Clothing');
  });

  it('falls back to the raw stored name when the label is unknown to the dictionary', () => {
    game.i18n = { localize: (key) => key, lang: 'de' };
    expect(registered.localizeOr('unknown_label', 'Raw Stored Name')).toBe(
      'Raw Stored Name'
    );
  });

  it('returns the fallback when key is not a string', () => {
    game.i18n = { localize: (key) => key, lang: 'de' };
    expect(registered.localizeOr(undefined, 'Fallback')).toBe('Fallback');
    expect(registered.localizeOr('', 'Fallback')).toBe('Fallback');
  });
});

describe('resolveItemName helper', () => {
  let registered;
  let settingStore;
  const originalI18n = game.i18n;

  beforeEach(async () => {
    registered = {};
    globalThis.Handlebars = {
      registerHelper: (name, fn) => (registered[name] = fn),
    };
    settingStore = '{}';
    game.settings = {
      get: () => settingStore,
      set: async (_scope, _key, value) => {
        settingStore = value;
      },
    };
    invalidateItemNameTranslationsCache();
    resolveItemNameHelper();
    await registerItemNameTranslations([
      {
        label: 'ares_predator_iv',
        translations: { en: 'Ares Predator IV', de: 'Ares Predator IV' },
      },
    ]);
  });

  afterEach(() => {
    game.i18n = originalI18n;
    delete game.settings;
  });

  it('resolves via the dictionary when there is no custom name', () => {
    game.i18n = { localize: (key) => key, lang: 'de' };
    expect(
      registered.resolveItemName('ares_predator_iv', 'Ares Predator IV')
    ).toBe('Ares Predator IV');
  });

  it('returns the raw name immediately when hasCustomName is set, skipping the static key and the dictionary', () => {
    game.i18n = {
      localize: (key) => (key === 'sr4.skills.archery' ? 'Archery' : key),
      lang: 'de',
    };
    expect(
      registered.resolveItemName('ares_predator_iv', 'Custom Name', true)
    ).toBe('Custom Name');
    expect(
      registered.resolveItemName('sr4.skills.archery', 'Custom Name', true)
    ).toBe('Custom Name');
  });

  it('ignores a falsy hasCustomName and resolves normally', () => {
    game.i18n = { localize: (key) => key, lang: 'de' };
    expect(
      registered.resolveItemName('ares_predator_iv', 'Ares Predator IV', false)
    ).toBe('Ares Predator IV');
  });
});
