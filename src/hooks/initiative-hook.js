// @ts-nocheck

export class InitiativeHook {
  constructor() {
    Hooks.once('init', () => {
      CONFIG.Combat.initiative = {
        decimals: 0,
      };
    });
  }
}
