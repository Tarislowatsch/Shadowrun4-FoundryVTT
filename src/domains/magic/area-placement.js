import { getGame, isTargetableActor } from '@utils/game/game.js';
import { emitSystemSocket } from '@utils/game/system-socket.js';
import {
  buildAreaRegionData,
  canCreateRegionDirectly,
  metersToPixels,
  sanitizeSpellAreaData,
  tokensInArea,
} from './area-template.js';

export const AREA_DISMISSED = 'dismissed';

/**
 * @typedef {object} PlacedSpellArea
 * @property {import('@documents/index').SR4Actor[]} actors
 * @property {object} regionData
 */

/**
 * @param {import('@documents/index').SR4Actor} caster
 * @param {import('@models/index').SR4Spell & { uuid: string }} spell
 * @param {number} radiusMeters
 * @returns {Promise<PlacedSpellArea | typeof AREA_DISMISSED | null>}
 */
export async function placeSpellArea(caster, spell, radiusMeters) {
  const scene = canvas?.scene;
  const layer = canvas?.regions;
  if (!scene || !layer) return null;

  const data = buildAreaRegionData({
    name: spell.name,
    radiusPx: metersToPixels(radiusMeters, {
      distancePixels: scene.dimensions.distancePixels,
      units: scene.grid?.units,
    }),
    casterUuid: caster.uuid,
    spellUuid: spell.uuid,
  });
  const preview = await layer.placeRegion(data, {
    create: false,
    allowRotation: false,
  });
  if (!preview) return AREA_DISMISSED;
  const regionData = sanitizeSpellAreaData(preview.toObject());
  if (!regionData) return null;

  const inside = tokensInArea(canvas.tokens?.placeables ?? [], (point) =>
    preview.testPoint(point)
  );
  const actors = new Map();
  for (const { actor } of inside) {
    if (isTargetableActor(actor) && !actors.has(actor.uuid)) {
      actors.set(actor.uuid, actor);
    }
  }
  return { actors: [...actors.values()], regionData };
}

/**
 * @param {object} regionData
 * @returns {Promise<void>}
 */
export async function createSpellArea(regionData) {
  const scene = canvas?.scene;
  if (!scene) return;
  const game = getGame();
  const direct = canCreateRegionDirectly({
    isGM: !!game.user?.isGM,
    canCreate: !!game.user?.can('REGION_CREATE'),
    paused: !!game.paused,
  });
  if (direct) {
    await scene.createEmbeddedDocuments('Region', [regionData]);
    return;
  }
  await emitSystemSocket({
    action: 'createSpellArea',
    payload: { sceneId: scene.id, regionData },
  });
}
