// @ts-nocheck
import { handleFreeRoll } from '@utils/index.js';

export class SceneControlsHook {
  constructor() {
    Hooks.on('getSceneControlButtons', this.#onGetControls.bind(this));
  }

  /**
   * @param {Record<string, object>} controls
   * @returns {void}
   */
  #onGetControls(controls) {
    const tokenControls = controls.tokens;
    if (!tokenControls) return;

    tokenControls.tools.sr4FreeRoll = {
      name: 'sr4FreeRoll',
      title: game.i18n.localize('sr4.roll.freeRollButton'),
      icon: 'fas fa-dice-six',
      button: true,
      order: Object.keys(tokenControls.tools).length,
      onClick: () => handleFreeRoll(),
    };
  }
}
