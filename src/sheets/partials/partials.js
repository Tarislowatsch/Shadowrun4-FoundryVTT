import { PARTIAL_MANIFEST } from '@utils/templates';

/** @returns {Promise<void>} */
export async function registerPartials() {
  try {
    await foundry.applications.handlebars.loadTemplates(PARTIAL_MANIFEST);
  } catch (error) {
    const message = 'Shadowrun 4e | Failed to load Handlebars partials';
    console.error(message, error);
    ui.notifications?.error(message);
    throw error;
  }
}
