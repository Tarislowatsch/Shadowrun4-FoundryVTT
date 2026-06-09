import { handleSkillRoll } from '@utils/index';

/**
 * Hooks into Foundry VTT's `renderActorSheet` event to attach click listeners
 * for skill roll buttons on SR4 character sheets.
 * Instantiated once at module load time.
 */
export class SkillRollHook {
  constructor() {
    Hooks.on('renderActorSheet', this.onRenderActorSheet.bind(this));
  }

  /**
   * Called by Foundry whenever an actor sheet is rendered.
   * Delegates listener setup to {@link SkillRollHook#setupSkillRollListener}.
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
   * @param {JQuery} html
   * @param {import('@documents/index').SR4Actor} actor
   * @returns {Promise<void>}
   */
  async setupSkillRollListener(html, actor) {
    html
      .find('.roll-skill')
      .off('click')
      .on('click', async (event) => {
        event.preventDefault();
        const skillName = $(event.currentTarget).data('skill');
        if (!skillName) return;
        await handleSkillRoll(actor, skillName);
      });
  }
}

new SkillRollHook();
