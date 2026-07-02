export async function registerActorPartials() {
  const basePath = 'systems/shadowrun4e/templates/sheets/actors/partials';

  const templatePaths = [
    { path: `${basePath}/actor-image.hbs`, name: 'actor-image' },
    { path: `${basePath}/critter-powers.hbs`, name: 'critter-powers' },
    { path: `${basePath}/attribute-cell.hbs`, name: 'attribute-cell' },
    { path: `${basePath}/status-track-card.hbs`, name: 'status-track-card' },
    { path: `${basePath}/actor-link-row.hbs`, name: 'actor-link-row' },
    {
      path: `${basePath}/linked-actor-card.hbs`,
      name: 'linked-actor-card',
    },
    { path: `${basePath}/npc-skills-section.hbs`, name: 'npc-skills-section' },
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
