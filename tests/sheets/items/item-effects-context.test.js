import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { invalidateWorldEffectTemplateCache } from '@effects/world-effect-templates.js';
import { SR4EffectTargets } from '@effects/SR4EffectTargets.js';
import { withFlagApi } from '../../helpers/foundry-document.js';

let SR4ItemSheet;

beforeAll(async () => {
  globalThis.foundry.applications = {
    api: {
      HandlebarsApplicationMixin: (Base) => class extends Base {},
      DocumentSheetV2: class {},
    },
    sheets: { ItemSheetV2: class {} },
  };
  ({ default: SR4ItemSheet } = await import('@sheets/items/item-sheet.js'));
});

/**
 * @param {object} data
 * @returns {object}
 */
function makeEffect(data) {
  return withFlagApi({
    img: 'icons/svg/aura.svg',
    disabled: false,
    changes: [],
    ...data,
  });
}

/**
 * @param {object} item
 * @returns {object}
 */
function makeSheet(item) {
  return { item, document: item };
}

/**
 * @param {object} sheet
 * @returns {object}
 */
function prepareContext(sheet) {
  const context = {};
  SR4ItemSheet.prototype._prepareActionsEffectsContext.call(sheet, context);
  return context;
}

describe('SR4ItemSheet#_prepareActionsEffectsContext', () => {
  beforeEach(() => {
    invalidateWorldEffectTemplateCache();
  });

  afterEach(() => {
    delete game.items;
    invalidateWorldEffectTemplateCache();
  });

  it('offers a template effect from a world item as a choice', () => {
    game.items = {
      contents: [
        {
          effects: {
            contents: [
              makeEffect({
                id: 'tpl1',
                name: 'Wired Reflexes',
                parent: { id: 'sourceItem' },
                flags: { shadowrun4e: { isEffectTemplate: true } },
              }),
            ],
          },
        },
      ],
    };
    const item = { id: 'i1', parent: null, effects: { contents: [] } };

    const context = prepareContext(makeSheet(item));

    expect(context.effectTemplates).toContainEqual({
      key: 'world:tpl1',
      name: 'Wired Reflexes',
      type: 'template',
    });
  });

  it('renders an item whose own effects are not templates (issue #2)', () => {
    const own = makeEffect({
      id: 'own',
      name: 'Plain Effect',
      parent: { id: 'i1' },
    });
    const item = { id: 'i1', parent: null, effects: { contents: [own] } };
    game.items = { contents: [{ effects: { contents: [own] } }] };

    const context = prepareContext(makeSheet(item));

    expect(context.effects).toHaveLength(1);
    expect(
      context.effectTemplates.some((t) => t.key.startsWith('world:'))
    ).toBe(false);
  });

  it('maps a change into a labelled row with a numeric value', () => {
    const own = makeEffect({
      id: 'own',
      name: 'Plain Effect',
      parent: { id: 'i1' },
      changes: [
        { key: 'system.modifiers.generalModifier', type: 'add', value: '2' },
      ],
    });
    const item = { id: 'i1', parent: null, effects: { contents: [own] } };

    const context = prepareContext(makeSheet(item));

    expect(context.effects[0].changes[0]).toEqual({
      key: 'system.modifiers.generalModifier',
      targetLabel: SR4EffectTargets['system.modifiers.generalModifier'],
      mode: 'add',
      value: 2,
    });
  });

  it('does not offer the edited item its own template effects', () => {
    game.items = {
      contents: [
        {
          effects: {
            contents: [
              makeEffect({
                id: 'mine',
                name: 'Mine',
                parent: { id: 'i1' },
                flags: { shadowrun4e: { isEffectTemplate: true } },
              }),
            ],
          },
        },
      ],
    };
    const item = { id: 'i1', parent: null, effects: { contents: [] } };

    const context = prepareContext(makeSheet(item));

    expect(context.effectTemplates.some((t) => t.key === 'world:mine')).toBe(
      false
    );
  });

  it('lists built-in templates even without any world item', () => {
    const item = { id: 'i1', parent: null, effects: { contents: [] } };

    const context = prepareContext(makeSheet(item));

    expect(
      context.effectTemplates.some((t) => t.key.startsWith('builtin:'))
    ).toBe(true);
    expect(context.hasExistingEffects).toBe(false);
  });
});
