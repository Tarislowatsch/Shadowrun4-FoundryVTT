import { localize } from '../dialogutility';
import { mapDocumentsByName } from './summoning.js';

/**
 * @typedef {{ source: 'actor' | 'compendium' | 'world', doc: object }} ComplexFormEntry
 */

/**
 * @returns {Promise<Map<string, ComplexFormEntry>>}
 */
export async function scanCompendiumComplexForms() {
  const result = new Map();
  const itemPacks = game.packs.filter((p) => p.documentName === 'Item');
  const allDocs = await Promise.all(itemPacks.map((p) => p.getDocuments()));
  for (const docs of allDocs) {
    const complexForms = docs.filter((doc) => doc.system?.complexform);
    const byName = mapDocumentsByName(complexForms);
    if (!byName) continue;
    for (const doc of byName.values()) {
      result.set(doc.uuid, { source: 'compendium', doc });
    }
  }
  return result;
}

/**
 * @returns {Map<string, ComplexFormEntry>}
 */
export function scanWorldComplexForms() {
  const result = new Map();
  for (const doc of game.items) {
    if (
      doc.system?.complexform &&
      doc.testUserPermission(
        game.user,
        CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
      )
    ) {
      result.set(doc.uuid, { source: 'world', doc });
    }
  }
  return result;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {Map<string, ComplexFormEntry>}
 */
export function scanActorComplexForms(actor) {
  const result = new Map();
  for (const doc of actor.items) {
    if (doc.type === 'Program' && doc.system.complexform) {
      result.set(doc.uuid, { source: 'actor', doc });
    }
  }
  return result;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {Promise<Map<string, ComplexFormEntry>>}
 */
export async function loadAvailableComplexForms(actor) {
  const actorForms = scanActorComplexForms(actor);
  const worldForms = scanWorldComplexForms();
  const compendiumForms = await scanCompendiumComplexForms();

  const byName = new Map();
  for (const entry of [
    ...actorForms.values(),
    ...worldForms.values(),
    ...compendiumForms.values(),
  ]) {
    const key = entry.doc.name?.toLowerCase();
    if (!key || byName.has(key)) continue;
    byName.set(key, entry);
  }
  return byName;
}

/**
 * @param {Map<string, ComplexFormEntry>} formsMap
 * @returns {string}
 */
function sourceLabel(source) {
  if (source === 'actor') return '';
  return localize(`sr4.matrix.${source}`);
}

/**
 * @param {number} hits
 * @param {number} maxUsable - min(hits, ratingCap - currentRating)
 * @param {number} ratingCap - 2 × Resonance
 * @returns {Promise<number | null>}
 */
export async function openHitsSelectionDialog(hits, maxUsable, ratingCap) {
  const hint = localize('sr4.matrix.threadingHitsHint')
    .replace('{hits}', String(hits))
    .replace('{cap}', String(ratingCap));
  const content = `<div class="form-group">
    <label for="usedHits">${localize('sr4.matrix.threadingHitsLabel')}</label>
    <input type="number" id="usedHits" name="usedHits" min="0" max="${maxUsable}" value="${maxUsable}" />
    <p class="hint">${hint}</p>
  </div>`;

  return foundry.applications.api.DialogV2.prompt({
    window: { title: localize('sr4.matrix.threadingDialogTitle') },
    content,
    ok: {
      label: localize('sr4.matrix.threading'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        const raw = parseInt(
          dialog.querySelector('#usedHits')?.value ?? '0',
          10
        );
        return Math.min(Math.max(raw, 0), maxUsable);
      },
    },
    cancel: {
      label: localize('sr4.cancel'),
      callback: () => null,
    },
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {Map<string, ComplexFormEntry>} formsMap
 * @returns {Promise<ComplexFormEntry | null>}
 */
export async function openThreadingSelectionDialog(actor, formsMap) {
  if (formsMap.size === 0) {
    ui?.notifications?.warn(localize('sr4.matrix.noComplexFormsAvailable'));
    return null;
  }

  const options = [...formsMap.entries()].map(([key, entry]) => ({
    key,
    name: entry.doc.name,
    sourceLabel: sourceLabel(entry.source),
  }));

  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/shadowrun4e/templates/magic/threading-dialog.hbs',
    { options }
  );

  return foundry.applications.api.DialogV2.prompt({
    window: { title: localize('sr4.matrix.threadingDialogTitle') },
    content,
    ok: {
      label: localize('sr4.matrix.threading'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        const key = dialog.querySelector('#complexFormKey')?.value ?? '';
        return formsMap.get(key) ?? null;
      },
    },
    cancel: {
      label: localize('sr4.cancel'),
      callback: () => null,
    },
  });
}
