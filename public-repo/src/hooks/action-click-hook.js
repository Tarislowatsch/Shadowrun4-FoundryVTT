import { openActionDialog, getGame } from '@utils/index';

/**
 * Hooks into Foundry VTT's `renderActorSheet` event to attach click listeners
 * for action roll buttons on SR4 character sheets.
 * Instantiated once at module load time.
 */
export class ActionClickHook {
  constructor() {
    Hooks.on('renderActorSheet', this.onRenderActorSheet.bind(this));
  }
  /**
   *
   * @param {import('@sheets/index').SR4CharacterSheet} sheet
   * @param {JQuery} html
   * @returns {void}
   */
  onRenderActorSheet(sheet, html) {
    this.setupSkillRollListener(html, sheet.actor);
  }

  /**
   * @async
   * @param {JQuery}
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  async setupSkillRollListener(html, actor) {
    html
      .find('.roll-action')
      .off('click')
      .on('click', async (event) => {
        event.preventDefault();
        const action = $(event.currentTarget).data('action');
        const rating1 = $(event.currentTarget).data('rating1');
        const rating2 = $(event.currentTarget).data('rating2');
        const action1 = $(event.currentTarget).data('action1');
        const action2 = $(event.currentTarget).data('action2');
        const actionName = `${action} (${action1} + ${action2})`;
        const numDice = rating1 + rating2;
        if ((!rating1 && !rating2) || numDice < 1) {
          ui?.notifications?.error(
            `${getGame().i18n?.localize('sr4.action.noRatingForAction')}`
          );
          return;
        }
        openActionDialog(actor, actionName, numDice);
      });
  }
}

new ActionClickHook();
