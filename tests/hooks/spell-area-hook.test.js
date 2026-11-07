import { describe, it, expect, vi, beforeEach } from 'vitest';

const isPrimaryGMMock = vi.fn();

vi.mock('@utils/actor-ownership.js', () => ({
  isPrimaryGM: () => isPrimaryGMMock(),
}));

const { SpellAreaHook } = await import('../../src/hooks/spell-area-hook.js');

const caster = { uuid: 'Actor.a' };
const spell = { uuid: 'Actor.a.Item.s', parent: caster };

function regionData(overrides = {}) {
  return {
    name: 'Fireball',
    shapes: [{ type: 'circle', x: 300, y: 400, radius: 80 }],
    flags: {
      shadowrun4e: {
        spellArea: { casterUuid: 'Actor.a', spellUuid: 'Actor.a.Item.s' },
      },
    },
    ...overrides,
  };
}

const templateDisplay = {
  visibility: 2,
  highlightMode: 'coverage',
  displayMeasurements: true,
};

function message(data, sceneId = 'Scene.1') {
  return {
    action: 'createSpellArea',
    payload: { sceneId, regionData: data },
  };
}

let createEmbeddedDocumentsMock;

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.Hooks = { once: vi.fn() };
  createEmbeddedDocumentsMock = vi.fn();
  globalThis.game.scenes = {
    get: (id) =>
      id === 'Scene.1'
        ? { createEmbeddedDocuments: createEmbeddedDocumentsMock }
        : undefined,
  };
  globalThis.fromUuid = vi.fn(async (uuid) =>
    uuid === spell.uuid ? spell : null
  );
  isPrimaryGMMock.mockReturnValue(true);
});

describe('SpellAreaHook — createSpellArea', () => {
  it('creates the region on the requested scene as primary GM', async () => {
    await new SpellAreaHook()._onSocketMessage(message(regionData()));

    expect(createEmbeddedDocumentsMock).toHaveBeenCalledWith('Region', [
      { ...regionData(), ...templateDisplay },
    ]);
  });

  it('strips injected behaviors before creating the region', async () => {
    const injected = regionData({
      behaviors: [{ type: 'executeScript', system: { source: 'evil()' } }],
      ownership: { default: 3 },
    });

    await new SpellAreaHook()._onSocketMessage(message(injected));

    const [[, [created]]] = createEmbeddedDocumentsMock.mock.calls;
    expect(created).not.toHaveProperty('behaviors');
    expect(created).not.toHaveProperty('ownership');
    expect(created).toEqual({ ...regionData(), ...templateDisplay });
  });

  it('rejects region data that is not a single spell circle', async () => {
    await new SpellAreaHook()._onSocketMessage(
      message(regionData({ shapes: [{ type: 'polygon', points: [] }] }))
    );

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });

  it('rejects a spell that does not belong to the named caster', async () => {
    const data = regionData();
    data.flags.shadowrun4e.spellArea.casterUuid = 'Actor.other';

    await new SpellAreaHook()._onSocketMessage(message(data));

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });

  it('rejects a world spell without an owning actor', async () => {
    globalThis.fromUuid = vi.fn(async () => ({ uuid: 'Item.s', parent: null }));

    await new SpellAreaHook()._onSocketMessage(message(regionData()));

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown spell', async () => {
    globalThis.fromUuid = vi.fn(async () => null);

    await new SpellAreaHook()._onSocketMessage(message(regionData()));

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });

  it('leaves the request to the primary GM', async () => {
    isPrimaryGMMock.mockReturnValue(false);

    await new SpellAreaHook()._onSocketMessage(message(regionData()));

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });

  it('ignores other socket actions', async () => {
    await new SpellAreaHook()._onSocketMessage({
      ...message(regionData()),
      action: 'somethingElse',
    });

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
  });

  it('ignores requests for unknown scenes', async () => {
    await expect(
      new SpellAreaHook()._onSocketMessage(message(regionData(), 'Scene.gone'))
    ).resolves.toBeUndefined();
  });
});
