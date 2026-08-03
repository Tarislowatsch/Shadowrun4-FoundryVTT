import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getWorldEffectTemplates,
  getAllEffectTemplates,
  resolveEffectTemplate,
  invalidateWorldEffectTemplateCache,
} from '@effects/world-effect-templates.js';
import { EFFECT_TEMPLATES } from '@effects/effect.templates.js';
import { withFlagApi } from './helpers/foundry-document.js';

/**
 * @param {object} data
 * @returns {object}
 */
function makeEffect(data) {
  return withFlagApi({
    changes: [],
    statuses: [],
    ...data,
    toObject() {
      return {
        _id: this.id,
        name: this.name,
        img: this.img,
        changes: this.changes,
        duration: this.duration,
        statuses: this.statuses,
        flags: this.flags,
      };
    },
  });
}

/**
 * @param {object[]} items
 * @returns {void}
 */
function setWorldItems(items) {
  game.items = { contents: items };
  invalidateWorldEffectTemplateCache();
}

const templateEffect = () =>
  makeEffect({
    id: 'tpl1',
    name: 'Wired Reflexes',
    img: 'icons/svg/aura.svg',
    flags: { shadowrun4e: { isEffectTemplate: true } },
    changes: [{ key: 'system.attributes.rea', type: 'add', value: '1' }],
    duration: { turns: 3 },
    statuses: ['hasted'],
  });

describe('getWorldEffectTemplates', () => {
  beforeEach(() => {
    invalidateWorldEffectTemplateCache();
  });

  afterEach(() => {
    delete game.items;
    invalidateWorldEffectTemplateCache();
  });

  it('collects template effects from world items', () => {
    const effect = templateEffect();
    setWorldItems([{ effects: { contents: [effect] } }]);

    expect(getWorldEffectTemplates()).toEqual([effect]);
  });

  it('reads the template flag without a flag-scope error (issue #2)', () => {
    setWorldItems([
      { effects: { contents: [makeEffect({ id: 'plain', name: 'Plain' })] } },
    ]);

    expect(() => getWorldEffectTemplates()).not.toThrow();
    expect(getWorldEffectTemplates()).toEqual([]);
  });

  it('ignores effects that are not flagged as templates', () => {
    const effect = templateEffect();
    setWorldItems([
      {
        effects: {
          contents: [effect, makeEffect({ id: 'other', name: 'Other' })],
        },
      },
    ]);

    expect(getWorldEffectTemplates()).toEqual([effect]);
  });

  it('returns an empty list when the world has no items', () => {
    invalidateWorldEffectTemplateCache();
    delete game.items;

    expect(getWorldEffectTemplates()).toEqual([]);
  });

  it('does not cache the empty list it returns before the world is ready', () => {
    delete game.items;
    getWorldEffectTemplates();

    game.items = { contents: [{ effects: { contents: [templateEffect()] } }] };

    expect(getWorldEffectTemplates()).toHaveLength(1);
  });

  it('hands out a copy so callers cannot empty the cache', () => {
    setWorldItems([{ effects: { contents: [templateEffect()] } }]);

    getWorldEffectTemplates().length = 0;

    expect(getWorldEffectTemplates()).toHaveLength(1);
  });

  it('serves the cached list until it is invalidated', () => {
    setWorldItems([{ effects: { contents: [templateEffect()] } }]);
    getWorldEffectTemplates();

    game.items = { contents: [] };
    expect(getWorldEffectTemplates()).toHaveLength(1);

    invalidateWorldEffectTemplateCache();
    expect(getWorldEffectTemplates()).toEqual([]);
  });
});

describe('getAllEffectTemplates', () => {
  beforeEach(() => {
    setWorldItems([{ effects: { contents: [templateEffect()] } }]);
  });

  afterEach(() => {
    delete game.items;
    invalidateWorldEffectTemplateCache();
  });

  it('namespaces built-in and world keys so they cannot collide', () => {
    const all = getAllEffectTemplates();
    const builtInKey = `builtin:${Object.keys(EFFECT_TEMPLATES)[0]}`;

    expect(all.map((t) => t.key)).toContain(builtInKey);
    expect(all.map((t) => t.key)).toContain('world:tpl1');
  });

  it('passes the world effect through unchanged', () => {
    const world = getAllEffectTemplates().find((t) => t.key === 'world:tpl1');

    expect(world).toEqual({
      key: 'world:tpl1',
      name: 'Wired Reflexes',
      img: 'icons/svg/aura.svg',
      changes: [{ key: 'system.attributes.rea', type: 'add', value: '1' }],
      duration: { turns: 3 },
      statuses: ['hasted'],
    });
  });

  it('localizes the built-in name and defaults its optional fields', () => {
    const [key, tpl] = Object.entries(EFFECT_TEMPLATES)[0];
    const builtIn = getAllEffectTemplates().find(
      (t) => t.key === `builtin:${key}`
    );

    expect(builtIn.name).toBe(game.i18n.localize(tpl.name));
    expect(builtIn.changes).toEqual(tpl.changes ?? []);
    expect(builtIn.statuses).toEqual(tpl.statuses ?? []);
  });

  it('copies the statuses so a caller cannot edit the world effect', () => {
    const world = getAllEffectTemplates().find((t) => t.key === 'world:tpl1');
    world.statuses.push('stunned');

    expect(getWorldEffectTemplates()[0].statuses).toEqual(['hasted']);
  });
});

describe('resolveEffectTemplate', () => {
  afterEach(() => {
    delete game.items;
    invalidateWorldEffectTemplateCache();
  });

  it('resolves a world template into creation data without its id', () => {
    setWorldItems([{ effects: { contents: [templateEffect()] } }]);

    const data = resolveEffectTemplate('world:tpl1');

    expect(data.name).toBe('Wired Reflexes');
    expect(data.changes).toEqual([
      { key: 'system.attributes.rea', type: 'add', value: '1' },
    ]);
    expect(data._id).toBeUndefined();
    expect(data.id).toBeUndefined();
  });

  it('returns undefined for an unknown world template', () => {
    setWorldItems([]);

    expect(resolveEffectTemplate('world:missing')).toBeUndefined();
  });

  it('resolves a built-in template by its namespaced key', () => {
    const key = Object.keys(EFFECT_TEMPLATES)[0];

    expect(resolveEffectTemplate(`builtin:${key}`)).toBeDefined();
  });
});
