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
* Cyberware / bioware (implants)
* Commlinks, programs, and autosofts
* Spells, adept/critter powers, foci, and fetishes
* Qualities
* Skills and actions
* Vehicle mods
* Generic gear / item fallback for system automation
* Rulebook source link on item cards, opening the page via the optional [PDF Pager](https://github.com/farling42/fvtt-pdf-pager) module

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
* Direct and indirect combat spells with networked defender resolution
* Automatic Sustain effect creation for sustained spells (client setting)
* Adept and critter powers

## Matrix

* Cybercombat flow: Matrix attacks with offensive programs (Attack, Black Hammer, Blackout) and networked defender resolution
* Matrix persona derived from equipped commlink or living persona (technomancer)
* Matrix condition monitor with icon crash and dumpshock on forced disconnect
* Black IC: biofeedback damage (VR only), connection jamming, and jack-out opposed test
* Device actor type for IC, Agents, and Nodes with matrix initiative and passes
* Matrix realm integration in combat tracker (hot/cold sim initiative and passes)

## Combat

* SR4Combat: initiative pass tracking
* SR4CombatTracker: pass display and inactive-combatant dimming
* Initiative formula with wound-penalty reduction
* GM defender picker for untargeted attacks
* Ammunition tracking on weapon attacks
* Combat spell defense (direct mana/physical resist, indirect dodge & soak)
* Configurable damage application workflow (world setting)

## Active Effects

* Native Foundry ActiveEffect integration
* Predefined effect templates: Sustain, Disoriented, Blind, Blind Flare Compensation, Knocked Down, Dumpshocked
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

**Supported export languages:** English and German are verified. Category/type fields (weapon, gear, armor, quality, knowledge-skill category, implant grade, ammo sub-type) are resolved via Chummer's English (`_english`) sibling field when the export provides one, so non-English exports work correctly for those regardless of language. Spells are a special case — Chummer's data files don't emit an English sibling for spell category/duration/range at all — so spell import has a dedicated German fallback and will only resolve correctly for English or German exports; other languages may import spells with an incorrect category or duration. Display-only text (character name, metatype, vehicle type) always keeps the exported language as-is.

## XML Importer

> **Unstable.** Results are not perfect yet — expect to clean up after an import.

A GM tool for bulk item import, found under **System Settings → "XML Data Importer"**. Point it at a statblock XML and it imports weapons, armor, gear, ammo, cyberware, bioware, spells, powers, programs and skills into tidy per-category world compendia.

No data is shipped with the system; bring your own.

## Localization

* English and German
* Full localization of all actor and item types

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
├── assets/
├── documents/
├── effects/
├── flows/
├── hooks/
├── lang/
├── models/
├── sheets/
├── styles/
├── templates/
└── utils/

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

MIT

# Disclaimer

Shadowrun is a registered trademark of The Topps Company, Inc. This project is an unofficial fan-made game system for Foundry Virtual Tabletop and is not affiliated with, endorsed by, or connected to The Topps Company, Inc. or Catalyst Game Labs.

This repository contains system code and limited example data only. No Shadowrun rulebook content, sourcebook text, artwork, or official game data is distributed with this project.
