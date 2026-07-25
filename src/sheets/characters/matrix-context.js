import {
  ActionCategory,
  FadingAttributes,
  StreamLabels,
  StreamSpriteTypes,
} from '@models/index';
import { getInitiativeBase } from '@domains/combat/initiative.js';
import {
  computeMatrixResponse,
  computeMatrixSystem,
  computeMatrixFirewall,
  computeBiofeedbackFilter,
  matrixSimPasses,
  hasMatrixAccess,
} from '@domains/matrix/derived-stats.js';
import { buildAffinityCategories } from './affinity-context.js';
import { getLinkedActors, buildStatRows } from './actor-context.js';

function buildMatrixActionButtons(system, matrixActions) {
  const matrixActionButtons = [
    {
      action: 'matrixAttack',
      icon: 'fas fa-bolt',
      label: game.i18n.localize('sr4.matrix.cybercombat.attack'),
    },
  ];

  if (system.matrix?.jammedBy) {
    matrixActionButtons.push({
      action: 'matrixJackOut',
      icon: 'fas fa-plug-circle-xmark',
      label: game.i18n.localize('sr4.matrix.cybercombat.jackOut'),
    });
  }

  const rollTooltip = game.i18n.localize('sr4.action.rollAction');
  for (const item of matrixActions) {
    const {
      rating1,
      rating2,
      actionPart1: action1,
      actionPart2: action2,
      category,
    } = item.system;
    matrixActionButtons.push({
      action: 'rollAction',
      icon: 'fas fa-dice-d20',
      label: item.name,
      tooltip: rollTooltip,
      itemId: item._id,
      rating1,
      rating2,
      action1,
      action2,
      category,
    });
  }

  return matrixActionButtons;
}

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

  const matrixActions = items.filter(
    (i) => i.type === 'Action' && i.system.category === ActionCategory.MATRIX
  );

  const base = {
    hasMatrixAccess: hasMatrixAccess(system, items),
    matrixJammed: !!system.matrix?.jammedBy,
    matrixMonitor: system.conditionMonitor?.matrix ?? { value: 0, max: 0 },
    matrixActions,
    matrixActionButtons: buildMatrixActionButtons(system, matrixActions),
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
