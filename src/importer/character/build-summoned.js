import { lower, parseNumber } from '../mappers/helpers.js';
import { resolveCritterTemplate } from '@domains/summoned-entity/dialogs/index.js';
import {
  buildCritterActorData,
  buildDefaultSheetStats,
} from './build-critter.js';

/**
 * @param {Record<string, unknown>} record
 * @param {string} ownerUuid
 * @returns {Promise<{ name: string, type: 'spirit'|'sprite', system: object, items?: Array<object> }>}
 */
export async function buildSummonedActorData(record, ownerUuid) {
  const isSprite = lower(record.type) === 'sprite';
  const entityType = isSprite ? 'sprite' : 'spirit';
  const force = parseNumber(record.force, 1);
  const name =
    String(record.crittername ?? '').trim() ||
    String(record.name ?? '').trim() ||
    'Unnamed';
  const services = parseNumber(record.services, 0);
  const templateName = String(record.name ?? '').trim();

  const template = await resolveCritterTemplate(templateName, entityType);
  if (template) {
    const built = await buildCritterActorData(
      template.system,
      templateName,
      force
    );
    built.name = name;
    built.img = template.img;
    built.system.ownerUuid = ownerUuid;
    if (isSprite) built.system.tasks = services;
    else built.system.services = services;
    return built;
  }

  const sheetStats = buildDefaultSheetStats(force, entityType);

  if (isSprite) {
    return {
      name,
      type: 'sprite',
      system: {
        rating: force,
        spriteType: templateName,
        tasks: services,
        ownerUuid,
        sheetStats,
      },
    };
  }

  return {
    name,
    type: 'spirit',
    system: {
      force,
      spiritType: templateName,
      services,
      ownerUuid,
      sheetStats,
    },
  };
}
