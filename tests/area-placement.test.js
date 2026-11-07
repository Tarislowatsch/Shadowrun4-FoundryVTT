import { describe, it, expect, vi, beforeEach } from 'vitest';

const emitSystemSocketMock = vi.fn();

vi.mock('@utils/game/system-socket.js', () => ({
  emitSystemSocket: (...args) => emitSystemSocketMock(...args),
}));

const { placeSpellArea, createSpellArea, AREA_DISMISSED } = await import(
  '../src/domains/magic/area-placement.js'
);

const caster = { uuid: 'Actor.caster' };
const spell = { uuid: 'Actor.caster.Item.fireball', name: 'Fireball' };

function token(x, y, actor) {
  return { center: { x, y }, document: { elevation: 0 }, actor };
}

const inside = { uuid: 'Actor.inside', type: 'npc' };
const vehicle = { uuid: 'Actor.car', type: 'vehicle' };
const spirit = { uuid: 'Actor.spirit', type: 'spirit' };
const device = { uuid: 'Actor.device', type: 'device' };

const placedFlag = {
  casterUuid: 'Actor.caster',
  spellUuid: 'Actor.caster.Item.fireball',
};

let placeRegionMock;
let createEmbeddedDocumentsMock;
let preview;

beforeEach(() => {
  vi.clearAllMocks();
  preview = {
    testPoint: ({ x }) => x < 100,
    toObject: () => ({
      _id: 'preview',
      name: 'Fireball',
      color: '#ff0000',
      behaviors: [],
      shapes: [{ type: 'circle', x: 320, y: 240, radius: 200, hole: false }],
      flags: { shadowrun4e: { spellArea: placedFlag } },
    }),
  };
  placeRegionMock = vi.fn().mockResolvedValue(preview);
  createEmbeddedDocumentsMock = vi.fn();
  globalThis.canvas = {
    scene: {
      id: 'Scene.1',
      dimensions: { distancePixels: 50 },
      grid: { units: 'm' },
      createEmbeddedDocuments: createEmbeddedDocumentsMock,
    },
    regions: { placeRegion: placeRegionMock },
    tokens: {
      placeables: [
        token(10, 10, inside),
        token(20, 20, inside),
        token(30, 30, vehicle),
        token(35, 35, spirit),
        token(40, 40, device),
        token(50, 50, null),
        token(500, 500, { uuid: 'Actor.far', type: 'npc' }),
      ],
    },
  };
  globalThis.game.user = { isGM: false, can: () => true };
  globalThis.game.paused = false;
});

describe('placeSpellArea', () => {
  it('lets the user place a preview circle sized in pixels', async () => {
    await placeSpellArea(caster, spell, 4);

    const [data, options] = placeRegionMock.mock.calls[0];
    expect(data.shapes[0].radius).toBe(200);
    expect(data.flags.shadowrun4e.spellArea).toEqual({
      casterUuid: 'Actor.caster',
      spellUuid: 'Actor.caster.Item.fireball',
    });
    expect(options).toEqual({ create: false, allowRotation: false });
  });

  it('sizes the circle in the scene grid units', async () => {
    globalThis.canvas.scene.grid.units = 'km';

    await placeSpellArea(caster, spell, 4000);

    expect(placeRegionMock.mock.calls[0][0].shapes[0].radius).toBe(200);
  });

  it('returns each targetable actor inside the area once', async () => {
    const area = await placeSpellArea(caster, spell, 4);

    expect(area.actors).toEqual([inside, vehicle, spirit]);
  });

  it('hands back only the sanitised spell circle at its placed position', async () => {
    const area = await placeSpellArea(caster, spell, 4);

    expect(area.regionData).toEqual({
      name: 'Fireball',
      shapes: [{ type: 'circle', x: 320, y: 240, radius: 200 }],
      visibility: 2,
      highlightMode: 'coverage',
      displayMeasurements: true,
      flags: { shadowrun4e: { spellArea: placedFlag } },
    });
  });

  it('returns null when the placed region is not a valid spell circle', async () => {
    preview.toObject = () => ({ name: 'Fireball', shapes: [] });

    await expect(placeSpellArea(caster, spell, 4)).resolves.toBeNull();
  });

  it('reports a dismissed placement', async () => {
    placeRegionMock.mockResolvedValue(null);

    await expect(placeSpellArea(caster, spell, 4)).resolves.toBe(
      AREA_DISMISSED
    );
  });

  it('returns null when the scene has no region layer', async () => {
    globalThis.canvas.regions = null;

    await expect(placeSpellArea(caster, spell, 4)).resolves.toBeNull();
  });

  it('returns null without a viewed scene', async () => {
    globalThis.canvas = { scene: null, regions: null };

    await expect(placeSpellArea(caster, spell, 4)).resolves.toBeNull();
  });
});

describe('createSpellArea', () => {
  const regionData = { name: 'Fireball' };

  it('creates the region directly when the user may', async () => {
    await createSpellArea(regionData);

    expect(createEmbeddedDocumentsMock).toHaveBeenCalledWith('Region', [
      regionData,
    ]);
    expect(emitSystemSocketMock).not.toHaveBeenCalled();
  });

  it('checks the REGION_CREATE permission', async () => {
    const can = vi.fn().mockReturnValue(true);
    globalThis.game.user = { isGM: false, can };

    await createSpellArea(regionData);

    expect(can).toHaveBeenCalledWith('REGION_CREATE');
  });

  it('asks the GM to create the region otherwise', async () => {
    globalThis.game.user = { isGM: false, can: () => false };

    await createSpellArea(regionData);

    expect(createEmbeddedDocumentsMock).not.toHaveBeenCalled();
    expect(emitSystemSocketMock).toHaveBeenCalledWith({
      action: 'createSpellArea',
      payload: { sceneId: 'Scene.1', regionData },
    });
  });

  it('asks the GM while the game is paused', async () => {
    globalThis.game.paused = true;

    await createSpellArea(regionData);

    expect(emitSystemSocketMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a viewed scene', async () => {
    globalThis.canvas = { scene: null };

    await createSpellArea(regionData);

    expect(emitSystemSocketMock).not.toHaveBeenCalled();
  });
});
