import {
  FadingAttributes,
  StreamLabels,
  StreamSpriteTypes,
} from '@models/index';
import { buildAffinityCategories } from './affinity-context.js';
import { getLinkedActors, buildStatRows } from './actor-context.js';

function buildSpriteStats(actor) {
  const sys = actor.system;
  const typeKey = `sr4.matrix.spriteTypes.${sys.spriteType}`;
  const typeLabel = sys.spriteType
    ? game.i18n.has(typeKey)
      ? game.i18n.localize(typeKey)
      : sys.spriteType
    : '';
  return buildStatRows([
    ['sr4.sprite.rating', sys.rating ?? 0],
    ['sr4.item.type', typeLabel],
    ['sr4.sprite.tasks', sys.tasks ?? 0],
  ]);
}

/**
 * @param {object} actorData
 * @param {string} ownerUuid
 */
export async function buildMatrixContext(actorData, ownerUuid) {
  const tn = actorData.system.technomancy;
  if (!tn?.technomancer) return {};
  const stats = actorData.system.sheetStats;
  const bonuses = actorData.system.livingPersona;
  const fadingAttr = tn.fadingAttribute ?? 'WILLPOWER';
  const spriteKeys = StreamSpriteTypes[tn.stream] ?? [];
  return {
    streams: StreamLabels,
    fadingAttributes: FadingAttributes,
    fadingPool:
      (stats.RESONANCE ?? 0) +
      (stats[fadingAttr] ?? 0) +
      (tn.compilingFadingBonus ?? 0),
    spriteAffinityCategories: await buildAffinityCategories(
      tn.spriteAffinities,
      'sr4.matrix.spriteTypes',
      'sprite',
      spriteKeys
    ),
    summonedSprites: getLinkedActors(
      ownerUuid,
      'sprite',
      'ownerUuid',
      buildSpriteStats
    ),
    livingPersona: {
      response: (stats.INTUITION ?? 0) + (bonuses.responseBonus ?? 0),
      signal:
        Math.ceil((stats.RESONANCE ?? 0) / 2) + (bonuses.signalBonus ?? 0),
      firewall: (stats.WILLPOWER ?? 0) + (bonuses.firewallBonus ?? 0),
      system: (stats.LOGIC ?? 0) + (bonuses.systemBonus ?? 0),
      biofeedbackFilter:
        (stats.CHARISMA ?? 0) + (bonuses.biofeedbackFilterBonus ?? 0),
      vrMatrixInitiative: (stats.INTUITION ?? 0) * 2 + 1,
      vrMatrixInitiativePasses: 3,
    },
  };
}
