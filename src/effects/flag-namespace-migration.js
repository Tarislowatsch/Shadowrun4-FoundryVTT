import { planFlagNamespaceMigration } from './flag-namespace.js';

const MIGRATED_PACK_TYPES = ['Actor', 'Item'];

/**
 * @param {{ effects?: { contents?: object[] }, updateEmbeddedDocuments?: Function }} document
 * @returns {Promise<number>}
 */
async function migrateEmbeddedEffects(document) {
  const plan = planFlagNamespaceMigration(document.effects?.contents ?? []);
  if (plan.length === 0) return 0;
  await document.updateEmbeddedDocuments('ActiveEffect', plan);
  return plan.length;
}

/**
 * @param {object} actor
 * @returns {Promise<number>}
 */
async function migrateActor(actor) {
  let migrated = await migrateEmbeddedEffects(actor);
  for (const item of actor.items?.contents ?? []) {
    migrated += await migrateEmbeddedEffects(item);
  }
  return migrated;
}

/**
 * @param {object} document
 * @returns {Promise<number>}
 */
async function migrateDocument(document) {
  return document.documentName === 'Actor'
    ? migrateActor(document)
    : migrateEmbeddedEffects(document);
}

/**
 * @returns {Promise<number>}
 */
async function migrateWorldPacks() {
  let migrated = 0;
  const packs = (game.packs ?? []).filter(
    (pack) =>
      pack.metadata?.packageType === 'world' &&
      MIGRATED_PACK_TYPES.includes(pack.metadata?.type)
  );

  for (const pack of packs) {
    if (pack.locked) {
      console.warn(
        `SR4 | skipping locked compendium ${pack.collection}, its legacy flags stay in place`
      );
      continue;
    }
    for (const document of await pack.getDocuments()) {
      migrated += await migrateDocument(document);
    }
  }
  return migrated;
}

/**
 * @returns {Promise<number>}
 */
export async function migrateWorldFlagNamespace() {
  let migrated = 0;
  for (const actor of game.actors?.contents ?? []) {
    migrated += await migrateActor(actor);
  }
  for (const item of game.items?.contents ?? []) {
    migrated += await migrateEmbeddedEffects(item);
  }
  return migrated + (await migrateWorldPacks());
}
