import {
  FadingAttributes,
  StreamLabels,
  StreamSpriteTypes,
} from '@models/index';
import { getInitiativeBase } from '@documents/initiative.js';
import {
  computeMatrixResponse,
  computeMatrixSystem,
  computeMatrixFirewall,
  computeBiofeedbackFilter,
  matrixSimPasses,
  hasMatrixAccess,
} from '@documents/derivedStats.mapper.js';
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
  const system = actorData.system;
  const items = actorData.items ?? [];
  const tn = system.technomancy;

  const base = {
    hasMatrixAccess: hasMatrixAccess(system, items),
    matrixJammed: !!system.matrix?.jammedBy,
    matrixMonitor: system.conditionMonitor?.matrix ?? { value: 0, max: 0 },
    matrixPersona: {
      response: computeMatrixResponse(system, items),
      firewall: computeMatrixFirewall(system, items),
      system: computeMatrixSystem(system, items),
      biofeedbackFilter: computeBiofeedbackFilter(system, items),
    },
  };

  if (!tn?.technomancer) return base;
  const stats = system.sheetStats;
  const bonuses = system.livingPersona;
  const fadingAttr = tn.fadingAttribute ?? 'WILLPOWER';
  const spriteKeys = StreamSpriteTypes[tn.stream] ?? [];
  return {
    ...base,
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
      response: computeMatrixResponse(actorData.system),
      signal: Math.min(
        Math.ceil((stats.RESONANCE ?? 0) / 2) + (bonuses.signalBonus ?? 0),
        stats.RESONANCE ?? 0
      ),
      firewall: computeMatrixFirewall(actorData.system),
      system: computeMatrixSystem(actorData.system),
      biofeedbackFilter: computeBiofeedbackFilter(actorData.system),
      vrMatrixInitiative: getInitiativeBase(actorData, 'matrix'),
      vrMatrixInitiativePasses: matrixSimPasses(actorData.system),
    },
  };
}
