import { SR4EffectTargets } from '@effects/index';

/** @param {foundry.utils.Collection} effects */
export function buildEffectsContext(effects) {
  return {
    effects: effects.contents.map((e) => ({
      id: e.id,
      name: e.name,
      img: e.img ?? 'icons/svg/aura.svg',
      active: !e.disabled,
      changes: e.changes.map((c) => {
        const key = c.key ?? '';
        const i18nKey = SR4EffectTargets[key];
        return {
          key,
          targetLabel: i18nKey
            ? game.i18n.localize(i18nKey)
            : key.split('.').pop(),
          mode: c.type ?? 'add',
          value: Number(c.value ?? 0),
        };
      }),
      description: e.description ?? '',
    })),
  };
}
