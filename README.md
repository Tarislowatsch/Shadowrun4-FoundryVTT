# Shadowrun 4th Edition for Foundry VTT

A custom implementation of **Shadowrun 4th Edition** for Foundry Virtual Tabletop.

# Features

## Actors

* Player character, NPC, Spirit, and Vehicle actor sheets
* Attribute and skill management
* Condition monitors (Physical / Stun)
* Lifestyle field
* Edit-mode toggle for locked sheets

## Items

* Skills
* Generic item support for system automation

## Roll System

* Roll dialogs with dice pool modifiers
* Edge support (spend / Rule of Six)
* Extended tests
* Weapon attacks (fire mode, burst, full-auto)
* Spell casting & drain rolls
* Free rolls and action rolls
* Combat defense rolls with automatic soak

## Combat

* SR4Combat: initiative pass tracking
* SR4CombatTracker: pass display and inactive-combatant dimming
* GM defender picker for untargeted attacks
* Configurable damage application workflow (world setting)

## Active Effects

* Native Foundry ActiveEffect integration
* Predefined effect templates: Sustain, Disoriented, Blind, Blind Flare Compensation, Knocked Down
* Attack and defense modifiers via effects
* Optional Foundry default effect sheet (GM setting)

## Settings

* Configurable NPC default skill list
* Damage application workflow toggle
* Optional Foundry default effect sheet for GMs

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

The system intentionally ships with only a minimal rules dataset. Additional content can be created manually or imported through external tooling.

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

The project uses a JSON-first workflow.

## Source JSON

Pack source files live in:

```text
utility/packs/
```

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
