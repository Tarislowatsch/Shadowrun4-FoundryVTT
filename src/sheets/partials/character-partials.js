export async function registerCharacterPartials() {
  const basePath = 'systems/shadowrun4e/templates/sheets/characters/partials';

  const templatePaths = [
    { path: `${basePath}/statblock.sheet.hbs`, name: 'statblock-sheet' },
    { path: `${basePath}/metadata.sheet.hbs`, name: 'metadata-sheet' },
    { path: `${basePath}/skills.grid.hbs`, name: 'skills-grid' },
    { path: `${basePath}/tabs/defense.tab.hbs`, name: 'defense-tab' },
    { path: `${basePath}/condition-monitor.hbs`, name: 'condition-monitor' },
    { path: `${basePath}/item-cards/weapon.card.hbs`, name: 'weapon-card' },
    { path: `${basePath}/item-cards/program.card.hbs`, name: 'program-card' },
    { path: `${basePath}/item-cards/item.card.hbs`, name: 'item-card' },
    { path: `${basePath}/item-cards/implant.card.hbs`, name: 'implant-card' },
    { path: `${basePath}/item-cards/armor.card.hbs`, name: 'armor-card' },
    { path: `${basePath}/item-cards/spell.card.hbs`, name: 'spell-card' },
    { path: `${basePath}/item-cards/power.card.hbs`, name: 'power-card' },
    { path: `${basePath}/item-cards/action.card.hbs`, name: 'action-card' },
    { path: `${basePath}/item-cards/commlink.card.hbs`, name: 'commlink-card' },
    { path: `${basePath}/item-cards/quality.card.hbs`, name: 'quality-card' },
    { path: `${basePath}/item-cards/metatype.card.hbs`, name: 'metatype-card' },
    { path: `${basePath}/item-cards/ammo.card.hbs`, name: 'ammo-card' },
    {
      path: `${basePath}/item-card-actions-effects.hbs`,
      name: 'item-card-actions-effects',
    },
    { path: `${basePath}/tabs/inventory.tab.hbs`, name: 'inventory-tab' },
    { path: `${basePath}/tabs/bio.tab.hbs`, name: 'bio-tab' },
    { path: `${basePath}/tabs/magic.tab.hbs`, name: 'magic-tab' },
    { path: `${basePath}/tabs/matrix.tab.hbs`, name: 'matrix-tab' },
    { path: `${basePath}/modifier-field.hbs`, name: 'modifier-field' },
    {
      path: `${basePath}/item-cards/partials/ammo-stats.hbs`,
      name: 'ammo-stats',
    },
  ];

  await Promise.all(
    templatePaths.map(async ({ path, name }) => {
      try {
        const res = await fetch(path);
        const partial = await res.text();
        Handlebars.registerPartial(name, partial);
        console.log(`${name} partial registered successfully.`);
      } catch (error) {
        console.error(`Error loading and registering ${name} partial:`, error);
      }
    })
  );
}
