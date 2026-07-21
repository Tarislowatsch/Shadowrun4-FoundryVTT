import { EFFECT_TEMPLATES } from './effect.templates.js';

const BUILTIN_PREFIX = 'builtin:';
const WORLD_PREFIX = 'world:';

/** @type {foundry.documents.ActiveEffect[]|null} */
let worldTemplateCache = null;

/**
 * Clears the cached list of world template effects. Call this whenever an
 * Item or ActiveEffect that could be flagged as a template changes.
 * @returns {void}
 */
export function invalidateWorldEffectTemplateCache() {
  worldTemplateCache = null;
}

/**
 * Collects ActiveEffects flagged as templates on any world-level Item.
 * Result is cached until invalidateWorldEffectTemplateCache() is called.
 * @returns {foundry.documents.ActiveEffect[]}
 */
export function getWorldEffectTemplates() {
  if (worldTemplateCache) return worldTemplateCache;

  const items = game.items?.contents ?? [];
  worldTemplateCache = items.flatMap((item) =>
    item.effects.contents.filter((effect) =>
      effect.getFlag('sr4', 'isEffectTemplate')
    )
  );
  return worldTemplateCache;
}

/**
 * Merges the built-in EFFECT_TEMPLATES with user-defined templates found on
 * world Items into a single list for consumers like the Token Action HUD.
 * Keys are namespaced ("builtin:<key>" / "world:<effectId>") so the two
 * sources can never collide.
 * @returns {Array<{key: string, name: string, img: string, changes: object[], duration: object|undefined, statuses: string[]}>}
 */
export function getAllEffectTemplates() {
  const builtIn = Object.entries(EFFECT_TEMPLATES).map(([key, tpl]) => ({
    key: `${BUILTIN_PREFIX}${key}`,
    name: game.i18n.localize(tpl.name),
    img: tpl.img,
    changes: tpl.changes ?? [],
    duration: tpl.duration,
    statuses: tpl.statuses ?? [],
  }));

  const world = getWorldEffectTemplates()
    .map((effect) => ({
      key: `${WORLD_PREFIX}${effect.id}`,
      name: effect.name,
      img: effect.img,
      changes: effect.changes ?? [],
      duration: effect.duration,
      statuses: [...(effect.statuses ?? [])],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...builtIn, ...world];
}

/**
 * Resolves a template key (as returned by getAllEffectTemplates, or a bare
 * built-in key for backward compatibility) into ActiveEffect creation data.
 * @param {string} key
 * @returns {Record<string, unknown>|undefined}
 */
export function resolveEffectTemplate(key) {
  if (key.startsWith(WORLD_PREFIX)) {
    const id = key.slice(WORLD_PREFIX.length);
    const effect = getWorldEffectTemplates().find((e) => e.id === id);
    if (!effect) return undefined;
    const data = effect.toObject();
    delete data._id;
    return data;
  }

  const builtinKey = key.startsWith(BUILTIN_PREFIX)
    ? key.slice(BUILTIN_PREFIX.length)
    : key;
  const template = EFFECT_TEMPLATES[builtinKey];
  if (!template) return undefined;
  const data = foundry.utils.deepClone(template);
  data.name = game.i18n.localize(data.name);
  return data;
}
