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
    { path: `${basePath}/tooltip.hbs`, name: 'tooltip' },
    { path: `${basePath}/fire-mode-selector.hbs`, name: 'fire-mode-selector' },
    { path: `${basePath}/item-toggle-equip.hbs`, name: 'item-toggle-equip' },
    { path: `${basePath}/item-create-btn.hbs`, name: 'item-create-btn' },
    { path: `${basePath}/item-edit-btn.hbs`, name: 'item-edit-btn' },
    { path: `${basePath}/item-delete-btn.hbs`, name: 'item-delete-btn' },
    { path: `${basePath}/meta-field.hbs`, name: 'meta-field' },
    { path: `${basePath}/textarea-field.hbs`, name: 'textarea-field' },
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
