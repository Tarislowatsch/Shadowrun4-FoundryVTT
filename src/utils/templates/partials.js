import { templatePath } from './system-path.js';

const ACTOR_PARTIALS = {
  'actor-image': templatePath('sheets/actors/partials/actor-image.hbs'),
  'actor-link-row': templatePath('sheets/actors/partials/actor-link-row.hbs'),
  'attribute-cell': templatePath('sheets/actors/partials/attribute-cell.hbs'),
  'critter-powers': templatePath('sheets/actors/partials/critter-powers.hbs'),
  'linked-actor-card': templatePath(
    'sheets/actors/partials/linked-actor-card.hbs'
  ),
  'monitor-tracks': templatePath('sheets/actors/partials/monitor-tracks.hbs'),
  'npc-notes': templatePath('sheets/actors/partials/npc-notes.hbs'),
  'npc-skills-section': templatePath(
    'sheets/actors/partials/npc-skills-section.hbs'
  ),
  'status-track-card': templatePath(
    'sheets/actors/partials/status-track-card.hbs'
  ),
};

const CHARACTER_PARTIALS = {
  'condition-monitor': templatePath(
    'sheets/characters/partials/condition-monitor.hbs'
  ),
  'derived-stat-actions': templatePath(
    'sheets/characters/partials/derived-stat-actions.hbs'
  ),
  'item-card-actions-effects': templatePath(
    'sheets/characters/partials/item-card-actions-effects.hbs'
  ),
  'metadata-sheet': templatePath(
    'sheets/characters/partials/metadata.sheet.hbs'
  ),
  'modifier-field': templatePath(
    'sheets/characters/partials/modifier-field.hbs'
  ),
  'skill-row-fields': templatePath(
    'sheets/characters/partials/skill-row-fields.hbs'
  ),
  'skills-grid': templatePath('sheets/characters/partials/skills.grid.hbs'),
  'statblock-sheet': templatePath(
    'sheets/characters/partials/statblock.sheet.hbs'
  ),
};

const ITEM_CARD_PARTIALS = {
  'action-card': templatePath('sheets/characters/item-cards/action.card.hbs'),
  'ammo-card': templatePath('sheets/characters/item-cards/ammo.card.hbs'),
  'armor-card': templatePath('sheets/characters/item-cards/armor.card.hbs'),
  'commlink-card': templatePath(
    'sheets/characters/item-cards/commlink.card.hbs'
  ),
  'focus-card': templatePath('sheets/characters/item-cards/focus.card.hbs'),
  'implant-card': templatePath('sheets/characters/item-cards/implant.card.hbs'),
  'item-card': templatePath('sheets/characters/item-cards/item.card.hbs'),
  'metatype-card': templatePath(
    'sheets/characters/item-cards/metatype.card.hbs'
  ),
  'power-card': templatePath('sheets/characters/item-cards/power.card.hbs'),
  'program-card': templatePath('sheets/characters/item-cards/program.card.hbs'),
  'quality-card': templatePath('sheets/characters/item-cards/quality.card.hbs'),
  'spell-card': templatePath('sheets/characters/item-cards/spell.card.hbs'),
  'weapon-card': templatePath('sheets/characters/item-cards/weapon.card.hbs'),
  'ammo-stats': templatePath(
    'sheets/characters/item-cards/partials/ammo-stats.hbs'
  ),
  'item-card-header': templatePath(
    'sheets/characters/item-cards/partials/item-card-header.hbs'
  ),
  'item-card-mods': templatePath(
    'sheets/characters/item-cards/partials/item-card-mods.hbs'
  ),
};

const ITEM_PARTIALS = {
  'armor-type-select': templatePath(
    'sheets/items/partials/armor-type-select.hbs'
  ),
  'item-actions-effects': templatePath(
    'sheets/items/partials/item-actions-effects.hbs'
  ),
  'item-sheet-header': templatePath(
    'sheets/items/partials/item-sheet-header.hbs'
  ),
  'item-textareas': templatePath('sheets/items/partials/item-textareas.hbs'),
  'mods-section': templatePath('sheets/items/partials/mods-section.hbs'),
};

const SHARED_PARTIALS = {
  'effect-table': templatePath('sheets/shared/effect-table.hbs'),
};

const MAGIC_PARTIALS = {
  'spell-force-header': templatePath(
    'domains/magic/dialogs/spell-force-header.hbs'
  ),
};

const UI_PARTIALS = {
  'action-button': templatePath('ui/partials/action-button.hbs'),
  'action-button-bar': templatePath('ui/partials/action-button-bar.hbs'),
  'attack-info': templatePath('ui/partials/attack-info.hbs'),
  'bonus-input': templatePath('ui/partials/bonus-input.hbs'),
  'collapsible-section': templatePath('ui/partials/collapsible-section.hbs'),
  'collapsible-subsection': templatePath(
    'ui/partials/collapsible-subsection.hbs'
  ),
  'control-mode-select': templatePath('ui/partials/control-mode-select.hbs'),
  'control-rig-checkbox': templatePath('ui/partials/control-rig-checkbox.hbs'),
  'edge-checkbox': templatePath('ui/partials/edge-checkbox.hbs'),
  'entity-affinities': templatePath('ui/partials/entity-affinities.hbs'),
  'fire-mode-selector': templatePath('ui/partials/fire-mode-selector.hbs'),
  'hot-sim-checkbox': templatePath('ui/partials/hot-sim-checkbox.hbs'),
  'item-active-badge': templatePath('ui/partials/item-active-badge.hbs'),
  'item-create-btn': templatePath('ui/partials/item-create-btn.hbs'),
  'item-delete-btn': templatePath('ui/partials/item-delete-btn.hbs'),
  'item-edit-btn': templatePath('ui/partials/item-edit-btn.hbs'),
  'item-list-block': templatePath('ui/partials/item-list-block.hbs'),
  'item-source-btn': templatePath('ui/partials/item-source-btn.hbs'),
  'item-source-cell': templatePath('ui/partials/item-source-cell.hbs'),
  'item-source-header': templatePath('ui/partials/item-source-header.hbs'),
  'item-toggle-equip': templatePath('ui/partials/item-toggle-equip.hbs'),
  'malus-input': templatePath('ui/partials/malus-input.hbs'),
  'matrix-action-button': templatePath('ui/partials/matrix-action-button.hbs'),
  'mentor-section': templatePath('ui/partials/mentor-section.hbs'),
  'meta-field': templatePath('ui/partials/meta-field.hbs'),
  'npc-item-list': templatePath('ui/partials/npc-item-list.hbs'),
  'pool-breakdown': templatePath('ui/partials/pool-breakdown.hbs'),
  'rigger-skill-select': templatePath('ui/partials/rigger-skill-select.hbs'),
  'skill-select': templatePath('ui/partials/skill-select.hbs'),
  'smartlink-checkbox': templatePath('ui/partials/smartlink-checkbox.hbs'),
  'specialization-checkbox': templatePath(
    'ui/partials/specialization-checkbox.hbs'
  ),
  'stat-cell': templatePath('ui/partials/stat-cell.hbs'),
  'textarea-field': templatePath('ui/partials/textarea-field.hbs'),
  tooltip: templatePath('ui/partials/tooltip.hbs'),
  'wide-burst-malus': templatePath('ui/partials/wide-burst-malus.hbs'),
};

export const PARTIAL_MANIFEST = {
  ...ACTOR_PARTIALS,
  ...CHARACTER_PARTIALS,
  ...ITEM_CARD_PARTIALS,
  ...ITEM_PARTIALS,
  ...SHARED_PARTIALS,
  ...MAGIC_PARTIALS,
  ...UI_PARTIALS,
};
