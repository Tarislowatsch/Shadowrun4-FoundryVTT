import { invalidateWorldEffectTemplateCache } from '@effects/index.js';

const INVALIDATING_EVENTS = [
  'createItem',
  'deleteItem',
  'createActiveEffect',
  'updateActiveEffect',
  'deleteActiveEffect',
];

export class EffectTemplateCacheHook {
  constructor() {
    for (const event of INVALIDATING_EVENTS) {
      Hooks.on(event, invalidateWorldEffectTemplateCache);
    }
  }
}
