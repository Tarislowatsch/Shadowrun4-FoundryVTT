// @ts-nocheck
export const DEFAULT_NPC_SKILLS = [
  'archery',
  'automatics',
  'blades',
  'clubs',
  'gunnery',
  'heavy-weapons',
  'longarms',
  'pistols',
  'throwing-weapons',
  'unarmed-combat',
  'counterspelling',
  'spellcasting',
  'summoning',
  'gymnastics',
  'infiltration',
  'intimidation',
  'perception',
  'running',
  'swimming',
];

export const DEFAULT_NPC_SKILLS_JSON = JSON.stringify(DEFAULT_NPC_SKILLS);

export class NpcSkillsMenu extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: 'sr4-npc-skills-menu',
    window: {
      title: 'sr4.settings.npcSkillsMenu.title',
      resizable: true,
    },
    position: { width: 480, height: 580 },
    actions: {
      save: NpcSkillsMenu.#onSave,
      toggleCategory: NpcSkillsMenu.#onToggleCategory,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/shadowrun4e/templates/settings/npc-skills-menu.hbs',
    },
  };

  async _prepareContext() {
    const compendium = game.packs.get('shadowrun4e.skills');
    if (!compendium) return { categories: [] };

    const index = await compendium.getIndex({ fields: ['system.category'] });
    const savedJson = game.settings.get('shadowrun4e', 'npcDefaultSkills');
    const saved = new Set(JSON.parse(savedJson || DEFAULT_NPC_SKILLS_JSON));

    const categoryMap = new Map();
    for (const entry of index) {
      if (entry.type !== 'Skill') continue;
      const cat = entry.system?.category ?? 'misc';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat).push({
        id: entry.name.toLowerCase(),
        name: entry.name,
        checked: saved.has(entry.name.toLowerCase()),
      });
    }

    return {
      categories: [...categoryMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, skills]) => ({
          key,
          label: `sr4.skills.categories.${key}`,
          skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
        })),
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element
      .querySelector('[data-filter]')
      ?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        this.element.querySelectorAll('.skill-option').forEach((el) => {
          el.style.display = el.querySelector('input')?.name.includes(term)
            ? ''
            : 'none';
        });
        this.element.querySelectorAll('.skill-category').forEach((cat) => {
          cat.style.display = [...cat.querySelectorAll('.skill-option')].some(
            (el) => el.style.display !== 'none'
          )
            ? ''
            : 'none';
        });
      });
  }

  static #onToggleCategory(event, target) {
    event.stopPropagation();
    const category = target.dataset.category;
    const checkboxes = [
      ...this.element.querySelectorAll(
        `[data-category="${category}"] input[type="checkbox"]`
      ),
    ];
    const allChecked = checkboxes.every((cb) => cb.checked);
    checkboxes.forEach((cb) => (cb.checked = !allChecked));
  }

  static async #onSave(_event, _target) {
    const inputs = this.element.querySelectorAll(
      'input[type="checkbox"][name]'
    );
    const selected = [...inputs]
      .filter((input) => input.checked)
      .map((input) => input.name);
    await game.settings.set(
      'shadowrun4e',
      'npcDefaultSkills',
      JSON.stringify(selected)
    );
    this.close();
  }
}
