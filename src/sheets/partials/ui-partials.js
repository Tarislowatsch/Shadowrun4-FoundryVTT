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
    { path: `${basePath}/skill-select.hbs`, name: 'skill-select' },
    {
      path: `${basePath}/control-mode-select.hbs`,
      name: 'control-mode-select',
    },
    {
      path: `${basePath}/rigger-skill-select.hbs`,
      name: 'rigger-skill-select',
    },
    { path: `${basePath}/pool-breakdown.hbs`, name: 'pool-breakdown' },
    { path: `${basePath}/attack-info.hbs`, name: 'attack-info' },
    { path: `${basePath}/wide-burst-malus.hbs`, name: 'wide-burst-malus' },
    {
      path: 'systems/shadowrun4e/templates/magic/spell-force-header.hbs',
      name: 'spell-force-header',
    },
    { path: `${basePath}/item-toggle-equip.hbs`, name: 'item-toggle-equip' },
    { path: `${basePath}/item-active-badge.hbs`, name: 'item-active-badge' },
    {
      path: `${basePath}/collapsible-section.hbs`,
      name: 'collapsible-section',
    },
    {
      path: `${basePath}/collapsible-subsection.hbs`,
      name: 'collapsible-subsection',
    },
    { path: `${basePath}/item-create-btn.hbs`, name: 'item-create-btn' },
    { path: `${basePath}/item-edit-btn.hbs`, name: 'item-edit-btn' },
    { path: `${basePath}/item-delete-btn.hbs`, name: 'item-delete-btn' },
    { path: `${basePath}/meta-field.hbs`, name: 'meta-field' },
    { path: `${basePath}/entity-affinities.hbs`, name: 'entity-affinities' },
    { path: `${basePath}/mentor-section.hbs`, name: 'mentor-section' },
    { path: `${basePath}/textarea-field.hbs`, name: 'textarea-field' },
    { path: `${basePath}/item-source-btn.hbs`, name: 'item-source-btn' },
    {
      path: `${basePath}/item-source-header.hbs`,
      name: 'item-source-header',
    },
    { path: `${basePath}/item-source-cell.hbs`, name: 'item-source-cell' },
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
