import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EffectTemplateCacheHook } from '../../src/hooks/effect-template-cache-hook.js';
import {
  getWorldEffectTemplates,
  invalidateWorldEffectTemplateCache,
} from '@effects/world-effect-templates.js';
import { SYSTEM_ID } from '../../src/utils/game/system-id.js';
import { withFlagApi } from '../helpers/foundry-document.js';

const EVENTS = [
  'createItem',
  'updateItem',
  'deleteItem',
  'createActiveEffect',
  'updateActiveEffect',
  'deleteActiveEffect',
];

/** @type {Map<string, Function[]>} */
let handlers;

/**
 * @param {string} id
 * @returns {object}
 */
function templateEffect(id) {
  return withFlagApi({
    id,
    name: id,
    flags: { [SYSTEM_ID]: { isEffectTemplate: true } },
  });
}

/**
 * @param {string} event
 * @returns {void}
 */
function fire(event) {
  for (const handler of handlers.get(event) ?? []) handler();
}

beforeEach(() => {
  handlers = new Map();
  globalThis.Hooks = {
    on: (event, handler) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(handler);
    },
  };
  game.items = {
    contents: [{ effects: { contents: [templateEffect('tpl1')] } }],
  };
  invalidateWorldEffectTemplateCache();
});

afterEach(() => {
  delete globalThis.Hooks;
  delete game.items;
  invalidateWorldEffectTemplateCache();
});

describe('EffectTemplateCacheHook', () => {
  it('registers every event that can change the template list', () => {
    new EffectTemplateCacheHook();

    expect([...handlers.keys()].sort()).toEqual([...EVENTS].sort());
  });

  it.each(EVENTS)('drops the cached templates on %s', (event) => {
    new EffectTemplateCacheHook();
    expect(getWorldEffectTemplates()).toHaveLength(1);

    game.items.contents[0].effects.contents.push(templateEffect('tpl2'));
    fire(event);

    expect(getWorldEffectTemplates()).toHaveLength(2);
  });

  it('leaves the cache alone on an event it does not listen for', () => {
    new EffectTemplateCacheHook();
    expect(getWorldEffectTemplates()).toHaveLength(1);

    game.items.contents[0].effects.contents.push(templateEffect('tpl2'));
    fire('updateActor');
    fire('createChatMessage');

    expect(getWorldEffectTemplates()).toHaveLength(1);
  });

  it('keeps serving the cache while no event fires', () => {
    new EffectTemplateCacheHook();
    expect(getWorldEffectTemplates()).toHaveLength(1);

    game.items.contents[0].effects.contents.push(templateEffect('tpl2'));

    expect(getWorldEffectTemplates()).toHaveLength(1);
  });
});
