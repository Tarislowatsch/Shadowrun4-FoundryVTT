# Shadowrun 4th Edition for Foundry VTT

A custom implementation of **Shadowrun 4th Edition** for Foundry Virtual Tabletop.

# Features

## Actors

* Player character, NPC, Spirit, Sprite, Vehicle, and Device (IC/Agent/Node) actor sheets
* Dedicated summoned-entity sheet shared by Spirits and Sprites
* Attribute and skill management
* Condition monitors (Physical / Stun / Matrix)
* Lifestyle field
* Edit-mode toggle for locked sheets
* Character import from Chummer XML (GM tool, *unstable*)

## Items

* Ranged & melee weapons, with weapon mods
* Armor, with armor mods
* Ammunition
* Cyberware / bioware (implants), with essence scaled by Biocompatibility and Sensitive System qualities
* Commlinks, programs, and autosofts
* Spells, adept/critter powers, foci, and fetishes
* Qualities
* Skills and actions
* Vehicle mods
* Generic gear / item fallback for system automation
* Rulebook source link on item cards, opening the page via the optional [PDF Pager](https://github.com/farling42/fvtt-pdf-pager) module
* Players can override an item's displayed name on its sheet, with a one-click revert to the canonical/localized name

## Roll System

* Roll dialogs with dice pool modifiers
* Edge support (spend / Rule of Six)
* Extended tests
* Weapon attacks (fire mode, burst, full-auto)
* Spell casting & drain rolls
* Free rolls and action rolls
* Combat defense rolls with automatic soak
* Reactive rolls (defense, soak, resist, dumpshock) resolvable via dialog or a public chat button, with timeout auto-resolution
* Edge offered after a roll resolves; Edge on initiative

## Magic

* Guided spellcasting flow with force selection and drain resistance
* Direct and indirect combat spells with networked defender resolution, elemental damage type derived from the spell's element (with override)
* Automatic Sustain effect creation for sustained spells (client setting)
* Adept and critter powers
* Summon/Compile, Bind (targeted), and Decompile/Banish actions for spirits and sprites
* Mystic adept Magic split: allocate Magic between magician abilities and adept powers on the sheet; spellcasting/conjuring rolls and Force caps use the magician share, imported from Chummer's power point field
* Adepts can suppress powers to free up Power Points lost to a reduced Magic attribute
* Background Count: GM-set scene modifier lowers effective Magic, spell/summoning dice pools and Force caps, and raises Drain resistance targets; GM picks which side of a mystic adept split it reduces

## Matrix

* Cybercombat flow: Matrix attacks with offensive programs (Attack, Black Hammer, Blackout) and networked defender resolution
* Matrix persona derived from equipped commlink or living persona (technomancer)
* Matrix condition monitor with icon crash and dumpshock on forced disconnect
* Black IC: biofeedback damage (VR only), connection jamming, and jack-out opposed test
* Device actor type for IC, Agents, and Nodes with matrix initiative and passes
* Matrix realm integration in combat tracker (hot/cold sim initiative and passes)
* Matrix Actions section on the character sheet's Matrix tab for Matrix/Rigging-categorized Action items, branching to a dedicated roll dialog with Hot Sim / Control Rig bonus checkboxes
* Jumped-in rigging: Control Rig and Hot Sim bonuses stack into the drone dice pool
* `openMatrixActionDialog` and the `ActionCategory` enum are exposed on `game.sr4` for external modules to replicate the Matrix/Rigging action branching
* Dynamic quick-action buttons for every Matrix Action item, alongside Attack/Jack Out, so rolls don't require opening the action list
* `CybercombatFlow` exposed on `game.sr4` so external modules can trigger Matrix Attack/Jack Out

## Combat

* SR4Combat: initiative pass tracking
* SR4CombatTracker: pass display and inactive-combatant dimming
* Initiative formula with wound-penalty reduction
* GM defender picker for untargeted attacks
* Vehicles and spirits count as valid targets for physical attacks, alongside characters and NPCs
* Ammunition tracking on weapon attacks
* Combat spell defense (direct mana/physical resist, indirect dodge & soak)
* Configurable damage application workflow (world setting)
* Full SR4 elemental damage type set (Acid, Radiation, Sound, Ice, Metal, Sand, Smoke, Water) with matching armor/AP rules
* "Shadowrun" scene controls group with Free Roll and GM Scene Modifiers (Background Count) toolbar buttons

## Active Effects

* Native Foundry ActiveEffect integration
* Predefined effect templates: Sustain, Disoriented, Blind, Blind Flare Compensation, Knocked Down, Dumpshocked
* World-item effects can be flagged as reusable templates and are offered in the item effect picker alongside the built-in ones; exposed on `game.sr4.effects` for other modules (e.g. Token Action HUD)
* Attack and defense modifiers via effects
* Optional Foundry default effect sheet (GM setting)

### Combat & Reaction Flows (menu)

All combat, magic, and matrix flow settings live in a dedicated **"Combat & Reaction Flows"** menu that groups them into automatic workflows, reactive decisions, timeouts, and personal (client) settings. World settings stay GM-only; players can still adjust their personal ones from the same menu.

* Combat defense workflow toggle, with automatic soak sub-toggle (soak disables when defense is off)
* Cybercombat workflow toggle
* GM defender picker for untargeted attacks
* Damage application workflow toggle
* **Reactive decision mode**: how reactive rolls (defense, soak, resist, dumpshock) are requested from the affected player — a **dialog** that opens immediately, or a public **chat button** that opens the same dialog when the responsible player clicks it. No click within the timeout auto-resolves with the dialog's standard pool.
* **Custom mode**: pick the decision mode per category (Combat / Magic / Matrix) — these options appear only when the global mode is set to Custom.
* Edge decision timeout and opposed-roll timeout for interactive flows
* Spell workflow & automatic Sustain effect (client settings)

### Other settings

* Configurable NPC default skill list (GM menu)
* Ammunition tracking toggle
* Live initiative reduction from wound penalties
* Optional Foundry default effect sheet for GMs
* XML Importer (GM tool for bulk item import, *unstable*)
* Source Books (GM menu): bind rulebook codes to PDF Pager PDF pages for the item-card source link

## Character Importer

> **Unstable.** Results are not perfect yet — review the imported actor before play.

A GM tool, reachable from the button in the **Actor Directory**. Point it at a single character XML export — the kind any decent *chummer* keeps on hand — and it creates a full `character` actor: attributes, skills (with ratings), magic, qualities, gear, weapons, armor, spells, powers, implants, and portrait. Also imports the character's summoned spirits/sprites and rigged vehicles as their own linked actors.

> **Only the XML export from Chummer's print screen works.** Open the character in Chummer, go to the **Print** view and export it as **XML** — this is the format the importer expects. Neither the regular `.chum` save file nor the Squad Manager export is supported.

**Supported export languages:** English and German are verified. Category/type fields (weapon, gear, armor, quality, knowledge-skill category, implant grade, ammo sub-type) are resolved via Chummer's English (`_english`) sibling field when the export provides one, so non-English exports work correctly for those regardless of language. Spells are a special case — Chummer's data files don't emit an English sibling for spell category/duration/range at all — so spell import has a dedicated German fallback and will only resolve correctly for English or German exports; other languages may import spells with an incorrect category or duration. Display-only text (character name, metatype, vehicle type) always keeps the exported language as-is. Item names in the export are in English; you can optionally upload Chummer's matching language file (e.g. `de_data.xml` for German) alongside the export to have imported items named in that language instead of English.

## XML Importer

> **Unstable.** Results are not perfect yet — expect to clean up after an import.

A GM tool for bulk item import, found under **System Settings → "XML Data Importer"**. Point it at a statblock XML and it imports into tidy per-category world compendia, grouped by source book so you can filter which books to pull in.

Supported record types:

* Ranged & melee weapons
* Weapon accessories and weapon / armor / vehicle mods
* Armor
* Gear, with automatic detection of ammunition and commlinks
* Cyberware and bioware
* Spells and adept powers
* Programs
* Qualities
* Mentor spirits and paragons
* Skills
* Metatypes and metavariants
* Critters and critter variants

No data is shipped with the system; bring your own. The importer reads a statblock XML in the shape the character generator's own data files use — see [utility/examples/](utility/examples/) for the fields each record type ends up in. Which file you feed it, and whether you are entitled to the content in it, is your call: this project neither hosts, bundles, nor links to game data.

Re-importing into a compendium you've already populated can update matching items in place instead of duplicating them (opt-in checkbox) — matches are found by Chummer GUID first, falling back to item name. A separate "Translate" action lets you apply a translation file to an already-imported compendium (or all of them at once) after the fact; the file's language is auto-detected from its filename but can be overridden.

## Localization

* English and German
* Full localization of all actor and item types
* World-shared item name translation dictionary, built up as compendia are imported or translated, keyed to each item's stable internal label rather than its display name
* Item cards and sheets automatically show the name in the viewing client's language via that dictionary; the compendium browser window localizes and searches item names the same way
* Skill names are translated in two places: `src/lang/*.labels.json` supplies the display name per language, and `src/importer/mappers/skill-translations/` maps a skill name from a non-English character export back onto the system's internal skill key so such exports can be parsed at all. Both are lists of individual skill terms — no rules text, no descriptions

## Token Action HUD

A companion plugin adds Token Action HUD support:
https://github.com/Tarislowatsch/tvtt-token-action-hud-sr4

Provides quick access to:

* Skills
* Free Rolls
* Condition Monitor
* Custom Actions

## Compendium Packs

Included packs:

* Skills
* Actions

The system intentionally ships with only a minimal rules dataset. Additional content is created at runtime via the built-in [XML Importer](#xml-importer) or authored manually.

## Developer Workflow

* Vite-based build pipeline
* Automatic Foundry deployment
* ESLint + Prettier
* ESModules only
* Hot deployment into Foundry user data

---

# Installation

## Manifest URL

```text
https://raw.githubusercontent.com/Tarislowatsch/Shadowrun4-FoundryVTT/main/system.json
```

## Direct Download

Latest release:
https://github.com/Tarislowatsch/Shadowrun4-FoundryVTT/releases/latest

---

# Development Setup

## Requirements

* Node.js 22+
* Foundry VTT v14

---

# Clone Repository

```bash
git clone https://github.com/Tarislowatsch/Shadowrun4-FoundryVTT.git
cd Shadowrun4-FoundryVTT
npm install
```

---

# Environment Variables

Create a `.env` file:

```env
FOUNDRY_PATH=/Users/<user>/FoundryVTT/Data/systems
FOUNDRY_INSTALL_PATH=/path/to/foundry
```

## Variables

| Variable               | Description                        |
| ---------------------- | ---------------------------------- |
| `FOUNDRY_PATH`         | Foundry userdata systems directory |
| `FOUNDRY_INSTALL_PATH` | Foundry installation directory     |

---

# Symlink Setup

The project creates local symlinks to Foundry internals for typings.

Run manually if needed:

```bash
npm run createSymlinks
```

This creates:

```text
foundry/client
foundry/common
foundry/lang
```

These are used for:

* IDE autocomplete
* Foundry API references

---

# Build Commands

## Build System

```bash
npm run build
```

Outputs into:

```text
/shadowrun4e
```

and automatically deploys into your Foundry userdata folder.

## Watch Mode

```bash
npm run watch
```

Continuously rebuilds and deploys changes.

## Build Database Packs

```bash
npm run build:db
```

Builds all compendium packs from JSON source data.

## Full Build

```bash
npm run build:full
```

Builds:

* Database packs
* System bundle

---

# Project Structure

```text
src/
├── documents/
├── domains/       # combat, magic, matrix, resonance, rigging, summoned-entity flows
├── effects/
├── hooks/
├── importer/      # XML/Chummer import logic
├── lang/
├── models/
├── sheets/
├── styles/
├── templates/
├── utils/
├── config.js
├── index.js
├── shadowrun4e.js
└── globals.d.ts

utility/
├── build-db.js
├── split-json.js
└── pack.js

packs/
```

---

# Compendium Workflow

Shipped packs (currently Skills and Actions) use a JSON-first workflow; all other item content is created at runtime via the [XML Importer](#xml-importer).

## Source JSON

Pack source files live in:

```text
utility/packs/
```

Reference shapes for each importable item type live in `utility/examples/`.

## Build Compendium

```bash
npm run build:db
```

---

# Item Data Philosophy

Most gameplay elements are implemented as Items.

Examples:

* Skills
* Equipment
* Spells
* Actions
* Custom content

This allows:

* Reusable compendiums
* Easier automation
* HUD integration
* Dynamic roll handling

---

# Scripts

| Script                   | Description                    |
| ------------------------ | ------------------------------ |
| `npm run build`          | Build system                   |
| `npm run build:full`     | Build system + packs           |
| `npm run build:db`       | Build compendiums              |
| `npm run watch`          | Watch mode                     |
| `npm run clean`          | Remove build output            |
| `npm run eslint`         | Run eslint                     |
| `npm run createSymlinks` | Create Foundry symlinks        |
| `npm run release`        | Bump version + changelog + tag |

---

# Compatibility

| Foundry Version | Status    |
| --------------- | --------- |
| v14             | Supported |

---

## License

The system code, styles, templates, and interface text in this repository are licensed under the [MIT License](LICENSE), Copyright (c) 2026 Tarislowatsch.

The MIT grant covers original work only. It does not — and cannot — extend to Shadowrun game content:

* **Game terms** — skill names, action names, and category labels, in English as well as in the translated forms used by the German localization (`src/lang/*.labels.json`) and by the importer's skill lookup table (`src/importer/mappers/skill-translations/`) — remain the property of their rights holders. They appear here as identifiers and labels, which is what makes the software usable with the game, and are not relicensed under MIT.
* **Rulebook references** such as `SR4, Page 228` in `utility/packs/` and `utility/examples/` are citations pointing into books the user owns, not reproductions of their content.
* **Character and item data you import** stays yours (or its rights holders'). The system stores it in your world; nothing is contributed back to this repository.

No third-party fonts or artwork are bundled; the system renders with Foundry's own fonts and CSS variables.

# Disclaimer

Shadowrun is a registered trademark of The Topps Company, Inc. This project is an unofficial fan-made game system for Foundry Virtual Tabletop and is not affiliated with, endorsed by, or connected to The Topps Company, Inc. or Catalyst Game Labs.

This repository contains system code and limited example data only. No rulebook or sourcebook text, no item and creature descriptions, no stat blocks, and no artwork are distributed with it. What it does contain of the game itself are names and terms — skill and action names, category labels, and page citations — which the software needs in order to refer to the rules at all. The shipped compendium packs are checked against prose creeping back in by [tests/shipped-data-no-rules-text.test.js](tests/shipped-data-no-rules-text.test.js).
