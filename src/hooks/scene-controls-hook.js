// @ts-nocheck
import { handleFreeRoll } from '@utils/index';
import { SceneModifiersMenu } from '@sheets/scene/scene-modifiers-menu.js';

export class SceneControlsHook {
  constructor() {
    Hooks.on('getSceneControlButtons', this.#onGetControls.bind(this));
  }

  /**
   * @param {Record<string, object>} controls
   * @returns {void}
   */
  #onGetControls(controls) {
    controls.sr4Controls = {
      name: 'sr4Controls',
      title: game.i18n.localize('sr4.controls.title'),
      icon: 'fas fa-user-secret',
      order: Object.keys(controls).length,
      tools: {
        freeRoll: {
          name: 'freeRoll',
          title: game.i18n.localize('sr4.roll.freeRollButton'),
          icon: 'fas fa-dice-six',
          button: true,
          order: 0,
          onChange: () => handleFreeRoll(),
        },
        sceneModifiers: {
          name: 'sceneModifiers',
          title: game.i18n.localize('sr4.scene.modifiers.button'),
          icon: 'fas fa-cloud',
          button: true,
          order: 1,
          visible: game.user.isGM,
          onChange: () => {
            if (!canvas.scene) {
              ui.notifications?.warn(
                game.i18n.localize('sr4.scene.modifiers.noScene')
              );
              return;
            }
            new SceneModifiersMenu({ scene: canvas.scene }).render(true);
          },
        },
      },
    };
  }
}
