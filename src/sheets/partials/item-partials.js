export async function registerItemPartials() {
  const basePath = 'systems/shadowrun4e/templates/sheets/items/partials';

  const templatePaths = [
    { path: `${basePath}/item-sheet-header.hbs`, name: 'item-sheet-header' },
    { path: `${basePath}/item-textareas.hbs`, name: 'item-textareas' },
    {
      path: `${basePath}/item-actions-effects.hbs`,
      name: 'item-actions-effects',
    },
  ];

  await Promise.all(
    templatePaths.map(async ({ path, name }) => {
      try {
        const res = await fetch(path);
        const partial = await res.text();
        Handlebars.registerPartial(name, partial);
      } catch (error) {
        console.error(`Error loading and registering ${name} partial:`, error);
      }
    })
  );
}
