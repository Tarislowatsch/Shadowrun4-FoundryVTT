export async function registerCharacterPartials() {
  const basePath = 'systems/shadowrun4e/templates/sheets/characters/partials';

  const templatePaths = [
    { path: `${basePath}/statblock.sheet.hbs`, name: 'statblock-sheet' },
    { path: `${basePath}/metadata.sheet.hbs`, name: 'metadata-sheet' },
    { path: `${basePath}/skills.grid.hbs`, name: 'skills-grid' },
    { path: `${basePath}/tabs/defense.tab.hbs`, name: 'defense-tab' },
    { path: `${basePath}/item-cards/weapon.card.hbs`, name: 'weapon-card' },
    { path: `${basePath}/item-cards/item.card.hbs`, name: 'item-card' },
    { path: `${basePath}/item-cards/implant.card.hbs`, name: 'implant-card' },
    { path: `${basePath}/item-cards/armor.card.hbs`, name: 'armor-card' },
    { path: `${basePath}/item-cards/spell.card.hbs`, name: 'spell-card' },
    { path: `${basePath}/item-cards/power.card.hbs`, name: 'power-card' },
    { path: `${basePath}/item-cards/action.card.hbs`, name: 'action-card' },
    { path: `${basePath}/tabs/inventory.tab.hbs`, name: 'inventory-tab' },
    { path: `${basePath}/tabs/magic.tab.hbs`, name: 'magic-tab' },
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
