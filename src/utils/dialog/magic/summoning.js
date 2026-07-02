import { localize } from '../dialogutility';
import { getAvailableAffinities, clampForce } from './summoning-helpers.js';

export {
  SPIRIT_AFFINITY_CATEGORIES,
  getAvailableAffinities,
  clampForce,
  calculateSummoningDrain,
} from './summoning-helpers.js';

/**
 * @param {object[]} docs
 * @returns {Map<string, object> | null}
 */
export function mapDocumentsByName(docs) {
  const map = new Map();
  for (const doc of docs) {
    if (doc.name) map.set(doc.name, doc);
  }
  return map.size > 0 ? map : null;
}

/**
 * @param {'spirit' | 'sprite'} entityType
 * @returns {Promise<Map<string, object> | null>}
 */
export async function loadCompendiumTemplates(entityType) {
  const settingKey =
    entityType === 'sprite' ? 'spriteCompendium' : 'spiritCompendium';
  const packId = game.settings.get('shadowrun4e', settingKey) ?? '';
  if (!packId) return null;
  const pack = game.packs.get(packId);
  if (!pack) return null;
  return mapDocumentsByName(await pack.getDocuments());
}

/**
 * @param {string} name
 * @param {'spirit' | 'sprite'} entityType
 * @returns {Promise<object | null>}
 */
export async function resolveCritterTemplate(name, entityType) {
  if (!name) return null;

  const worldMatch = game.items?.find(
    (i) =>
      i.type === 'CritterTemplate' &&
      i.name === name &&
      i.system?.actorType === entityType
  );
  if (worldMatch) return worldMatch;

  const templateMap = await loadCompendiumTemplates(entityType);
  return templateMap?.get(name) ?? null;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {'spirit' | 'sprite'} entityType
 * @returns {Promise<{ spiritType: string, force: number, templateItem: object | null } | null>}
 */
export async function openSummoningDialog(actor, entityType) {
  const isSprite = entityType === 'sprite';
  const affinities = isSprite
    ? (actor.system.technomancy?.spriteAffinities ?? {})
    : (actor.system.magic?.spiritAffinities ?? {});

  const availableTypes = getAvailableAffinities(affinities);

  if (availableTypes.length === 0) {
    const msgKey = isSprite
      ? 'sr4.magic.noSpriteAffinities'
      : 'sr4.magic.noSpiritAffinities';
    ui?.notifications?.warn(game.i18n.localize(msgKey));
    return null;
  }

  const templateMap = await loadCompendiumTemplates(entityType);

  const statKey = isSprite ? 'RESONANCE' : 'MAGIC';
  const statValue = actor.getAttribute(statKey) ?? 0;
  const maxForce = statValue * 2;

  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/shadowrun4e/templates/magic/summoning-dialog.hbs',
    {
      availableTypes,
      selectLabel: game.i18n.localize(
        isSprite ? 'sr4.magic.selectSpriteType' : 'sr4.magic.selectSpiritType'
      ),
      maxForce,
      defaultForce: statValue,
    }
  );

  const titleKey = isSprite
    ? 'sr4.magic.compileDialogTitle'
    : 'sr4.magic.summonDialogTitle';

  return foundry.applications.api.DialogV2.prompt({
    window: { title: localize(titleKey) },
    content,
    ok: {
      label: localize(isSprite ? 'sr4.magic.compile' : 'sr4.magic.summon'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        const spiritType = dialog.querySelector('#spiritType')?.value ?? '';
        const rawForce =
          parseInt(dialog.querySelector('#force')?.value ?? '0') || 1;
        const force = clampForce(rawForce, maxForce);

        const templateItem = templateMap?.get(spiritType) ?? null;

        return { spiritType, force, templateItem };
      },
    },
    cancel: {
      label: localize('sr4.cancel'),
      callback: () => null,
    },
  });
}
