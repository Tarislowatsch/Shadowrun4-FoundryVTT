/**
 * Prompts whether the combatant burns Edge before rolling initiative.
 * @returns {Promise<boolean>}
 */
export async function promptEdgeFirst() {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize('sr4.combat.edgeFirst.title') },
    content: `<p>${game.i18n.localize('sr4.combat.edgeFirst.prompt')}</p>`,
    yes: { label: game.i18n.localize('sr4.combat.edgeFirst.yes') },
    no: { label: game.i18n.localize('sr4.combat.edgeFirst.no') },
    defaultYes: false,
  });
}
