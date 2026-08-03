import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { migrateWorldFlagNamespace } from '../../src/effects/flag-namespace-migration.js';
import { LEGACY_FLAG_SCOPE } from '../../src/effects/flag-namespace.js';
import { SYSTEM_ID } from '../../src/utils/game/system-id.js';

/**
 * @param {string} id
 * @returns {object}
 */
function legacyEffect(id) {
  return { id, flags: { [LEGACY_FLAG_SCOPE]: { showOnToken: true } } };
}

/**
 * @param {object[]} effects
 * @param {object[]} [items]
 * @returns {object}
 */
function makeDocument(effects, items = []) {
  return {
    effects: { contents: effects },
    items: { contents: items },
    updateEmbeddedDocuments: vi.fn(async () => []),
  };
}

let warn;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  globalThis.game.actors = { contents: [] };
  globalThis.game.items = { contents: [] };
  globalThis.game.packs = [];
});

afterEach(() => {
  warn.mockRestore();
  delete globalThis.game.actors;
  delete globalThis.game.items;
  delete globalThis.game.packs;
});

describe('migrateWorldFlagNamespace', () => {
  it('migrates effects on the actor itself', async () => {
    const actor = makeDocument([legacyEffect('e1')]);
    game.actors.contents = [actor];

    expect(await migrateWorldFlagNamespace()).toBe(1);
    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
      'ActiveEffect',
      expect.arrayContaining([expect.objectContaining({ _id: 'e1' })])
    );
  });

  it('migrates effects on the items an actor owns', async () => {
    const ownedItem = makeDocument([legacyEffect('owned')]);
    const actor = makeDocument([], [ownedItem]);
    game.actors.contents = [actor];

    expect(await migrateWorldFlagNamespace()).toBe(1);
    expect(ownedItem.updateEmbeddedDocuments).toHaveBeenCalledOnce();
  });

  it('migrates effects on world items', async () => {
    const item = makeDocument([legacyEffect('e1')]);
    game.items.contents = [item];

    expect(await migrateWorldFlagNamespace()).toBe(1);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledOnce();
  });

  it('walks actors inside world compendia, items included', async () => {
    const ownedItem = makeDocument([legacyEffect('owned')]);
    const packActor = makeDocument([legacyEffect('own')], [ownedItem]);
    packActor.documentName = 'Actor';
    game.packs = [
      {
        collection: 'world.npcs',
        locked: false,
        metadata: { packageType: 'world', type: 'Actor' },
        getDocuments: async () => [packActor],
      },
    ];

    expect(await migrateWorldFlagNamespace()).toBe(2);
    expect(ownedItem.updateEmbeddedDocuments).toHaveBeenCalledOnce();
  });

  it('skips locked compendia and says so', async () => {
    const getDocuments = vi.fn();
    game.packs = [
      {
        collection: 'world.locked',
        locked: true,
        metadata: { packageType: 'world', type: 'Item' },
        getDocuments,
      },
    ];

    expect(await migrateWorldFlagNamespace()).toBe(0);
    expect(getDocuments).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('world.locked'));
  });

  it('leaves system compendia alone', async () => {
    const getDocuments = vi.fn();
    game.packs = [
      {
        collection: 'shadowrun4e.skills',
        locked: false,
        metadata: { packageType: 'system', type: 'Item' },
        getDocuments,
      },
    ];

    await migrateWorldFlagNamespace();

    expect(getDocuments).not.toHaveBeenCalled();
  });

  it('writes nothing when there is no legacy data left', async () => {
    const actor = makeDocument([
      { id: 'e1', flags: { [SYSTEM_ID]: { showOnToken: true } } },
    ]);
    game.actors.contents = [actor];

    expect(await migrateWorldFlagNamespace()).toBe(0);
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });
});
