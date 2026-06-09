export async function registerUIPartials() {
  const basePath = 'systems/shadowrun4e/templates/ui/partials';
  const templatePaths = [
    { path: `${basePath}/edge-checkbox.hbs`, name: 'edge-checkbox' },
    {
      path: `${basePath}/specialization-checkbox.hbs`,
      name: 'specialization-checkbox',
    },
    { path: `${basePath}/bonus-input.hbs`, name: 'bonus-input' },
    { path: `${basePath}/malus-input.hbs`, name: 'malus-input' },
    { path: `${basePath}/smartlink-checkbox.hbs`, name: 'smartlink-checkbox' },
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
