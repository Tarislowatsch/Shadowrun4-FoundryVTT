import { SYSTEM_ID } from '@utils/game/system-id.js';

export const LEGACY_FLAG_SCOPE = 'sr4';

/**
 * @param {Record<string, unknown>} [flags]
 * @returns {Record<string, unknown>}
 */
export function mergeLegacyFlags(flags) {
  return { ...flags?.[LEGACY_FLAG_SCOPE], ...flags?.[SYSTEM_ID] };
}

/**
 * @param {Array<{ id: string, flags?: Record<string, unknown> }>} effects
 * @returns {Array<{ _id: string, flags: Record<string, unknown> }>}
 */
export function planFlagNamespaceMigration(effects) {
  const plan = [];
  for (const effect of effects) {
    if (!effect.flags?.[LEGACY_FLAG_SCOPE]) continue;
    plan.push({
      _id: effect.id,
      flags: {
        [SYSTEM_ID]: mergeLegacyFlags(effect.flags),
        [`-=${LEGACY_FLAG_SCOPE}`]: null,
      },
    });
  }
  return plan;
}
