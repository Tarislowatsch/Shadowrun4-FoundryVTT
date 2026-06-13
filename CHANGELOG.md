# Changelog

## [1.0.3](https://github.com/Tarislowatsch/sr4foundry/compare/v1.0.2...v1.0.3) (2026-06-13)


### Bug Fixes

* **styles:** correct import path in npc-sheet.scss after SCSS reorganization ([ae46cc7](https://github.com/Tarislowatsch/sr4foundry/commit/ae46cc74e7e726e00725b66f20c45ae99119642e))

## [1.0.2](https://github.com/Tarislowatsch/sr4foundry/compare/v1.0.1...v1.0.2) (2026-06-13)


### Bug Fixes

* apply magic-card styles to matrix-card tab ([6829a9a](https://github.com/Tarislowatsch/sr4foundry/commit/6829a9a3b7c9dbd46626e2e0af1861fa6d4ae993))
* restore item-card margin-top and item-reload hover state ([c753be9](https://github.com/Tarislowatsch/sr4foundry/commit/c753be9d85842c70919b8a2575ea089bcb2b239e))
* style thread-button, p placeholders and td colors in matrix tab ([f2e1b50](https://github.com/Tarislowatsch/sr4foundry/commit/f2e1b5040c765c7cde1901e90fa5f62a7c409b6a))

## [1.0.1](https://github.com/Tarislowatsch/sr4foundry/compare/v1.0.0...v1.0.1) (2026-06-13)


### Bug Fixes

* **defense:** use actual rolled dice pool for edge reroll calculation ([97a9141](https://github.com/Tarislowatsch/sr4foundry/commit/97a9141f548751df9fc26b8cb97d3dc9f9e7c96e))
* **packs:** restore missing opening bracket in spells.json ([55496d0](https://github.com/Tarislowatsch/sr4foundry/commit/55496d0ad74b1862d05463d7a097da954305ba2e))
* **release:** sync package.json version from git tag before bump ([c06860e](https://github.com/Tarislowatsch/sr4foundry/commit/c06860ee7fd5e6771576d7523fb84f9387e09d5a))
* **spells:** normalize category casing and add missing EN translation ([73112b4](https://github.com/Tarislowatsch/sr4foundry/commit/73112b440a83efb908114228ebbb776d40637bfb))


### Features

* **combat:** add GM defender picker for untargeted attacks ([df14fcb](https://github.com/Tarislowatsch/sr4foundry/commit/df14fcbf1908693b8a478647bc013d63db5a6b3b))
* **combat:** add SR4Combat with initiative pass tracking ([6f5d9d0](https://github.com/Tarislowatsch/sr4foundry/commit/6f5d9d01062f26e3956a5bc3bfef9461b17bfdb2))
* **combat:** add SR4CombatTracker with pass display and inactive dimming ([828047c](https://github.com/Tarislowatsch/sr4foundry/commit/828047c04d4f22bd51096715978eab05ba8044d3))
* **effects:** add blind, blindFlareComp, knockedDown templates with attack/defense modifiers ([ae6c21e](https://github.com/Tarislowatsch/sr4foundry/commit/ae6c21e9b3aa87680a5d1e8848893a74223831d2))


### Reverts

* Revert "chore(release): v1.2.0" ([1f7695e](https://github.com/Tarislowatsch/sr4foundry/commit/1f7695e0ad208e6cbb9a3dc97b9e9f51e7910f7b))

## [1.0.1](https://github.com/Tarislowatsch/sr4foundry/compare/v1.0.0...v1.0.1) (2026-06-13)


### Bug Fixes

* **defense:** use actual rolled dice pool for edge reroll calculation ([97a9141](https://github.com/Tarislowatsch/sr4foundry/commit/97a9141f548751df9fc26b8cb97d3dc9f9e7c96e))
* **packs:** restore missing opening bracket in spells.json ([55496d0](https://github.com/Tarislowatsch/sr4foundry/commit/55496d0ad74b1862d05463d7a097da954305ba2e))
* **release:** sync package.json version from git tag before bump ([c06860e](https://github.com/Tarislowatsch/sr4foundry/commit/c06860ee7fd5e6771576d7523fb84f9387e09d5a))
* **spells:** normalize category casing and add missing EN translation ([73112b4](https://github.com/Tarislowatsch/sr4foundry/commit/73112b440a83efb908114228ebbb776d40637bfb))


### Features

* **combat:** add GM defender picker for untargeted attacks ([df14fcb](https://github.com/Tarislowatsch/sr4foundry/commit/df14fcbf1908693b8a478647bc013d63db5a6b3b))
* **combat:** add SR4Combat with initiative pass tracking ([6f5d9d0](https://github.com/Tarislowatsch/sr4foundry/commit/6f5d9d01062f26e3956a5bc3bfef9461b17bfdb2))
* **combat:** add SR4CombatTracker with pass display and inactive dimming ([828047c](https://github.com/Tarislowatsch/sr4foundry/commit/828047c04d4f22bd51096715978eab05ba8044d3))
* **effects:** add blind, blindFlareComp, knockedDown templates with attack/defense modifiers ([ae6c21e](https://github.com/Tarislowatsch/sr4foundry/commit/ae6c21e9b3aa87680a5d1e8848893a74223831d2))


### Reverts

* Revert "chore(release): v1.2.0" ([1f7695e](https://github.com/Tarislowatsch/sr4foundry/commit/1f7695e0ad208e6cbb9a3dc97b9e9f51e7910f7b))

# [1.0.0](https://github.com/Tarislowatsch/sr4foundry/compare/v0.2.0...v1.0.0) (2026-06-13)

# [0.2.0](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.32...v0.2.0) (2026-06-13)


### Bug Fixes

* **dialogutility:** don't emit defensetrigger if attack is a glitch ([2e56a92](https://github.com/Tarislowatsch/sr4foundry/commit/2e56a928ee761705dd382dfef3bc7953bc943145))
* **initiative:** sync sheetStats from computed values + rework passes semantics ([e10b85c](https://github.com/Tarislowatsch/sr4foundry/commit/e10b85ca5a16986baf5b988ce60849caa5946618))
* **sheets:** repair implant card context bug and unify card call conventions ([b4f99b8](https://github.com/Tarislowatsch/sr4foundry/commit/b4f99b8d52761769711ee4086455ffe975085c8c))


### Features

* **ammo:** SR4AmmoData model + Ammo item type registration ([ba03e2f](https://github.com/Tarislowatsch/sr4foundry/commit/ba03e2f31032584fda9f685da2e4c5a7be356085))
* **attack:** ammo quantity depletion as batch update ([88a7bb7](https://github.com/Tarislowatsch/sr4foundry/commit/88a7bb7b3ae8f360d3cc98fb118020affb80a26b))
* **damage:** composure hint on electricity damage ([04b116a](https://github.com/Tarislowatsch/sr4foundry/commit/04b116aefef7790d95f7c52491654c5ed5671084))
* **damage:** electricity disorientation effect + correct rule hint ([8550d2e](https://github.com/Tarislowatsch/sr4foundry/commit/8550d2e578aca8cd932de3dd0d4867191e8f5397))
* **defense:** weapon snapshot with effective values + isPhysicalDamageType ([c52bd37](https://github.com/Tarislowatsch/sr4foundry/commit/c52bd37ef721910d2a9e0691011796fe24a2c237))
* **effects:** show SR4 active effects as token icons, add duration + showOnToken to effect editor ([e5be3df](https://github.com/Tarislowatsch/sr4foundry/commit/e5be3df997b3e48026ab7fd6c4044949a47d5166))
* **matrix:** add Living Persona, Complex Forms and Threading for Technomancers ([cb8863d](https://github.com/Tarislowatsch/sr4foundry/commit/cb8863d40414641b3350f4baf3b40d472a2fcc0c))
* **matrix:** add Matrix tab, Commlink item type and sheet ([7e5967d](https://github.com/Tarislowatsch/sr4foundry/commit/7e5967da7302354327367b6a8c8eb3e8cb52f442))
* **monitor:** rename conditionMonitor.current to .value, add setMonitorValue/resetMonitor API, shorten electricityHint ([6fbd4b6](https://github.com/Tarislowatsch/sr4foundry/commit/6fbd4b698004b063438f7afce5ef44a2ab19a1e1))
* **ui:** ammo display on weapon card + buildWeaponContext ([b9b81c7](https://github.com/Tarislowatsch/sr4foundry/commit/b9b81c73af403e8eca729e11b8edb55429035413))
* **ui:** ammo selector in item sheet + melee cleanup ([5a797ed](https://github.com/Tarislowatsch/sr4foundry/commit/5a797ed323489407762c3a4720cec9908c332899))

## [0.1.32](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.31...v0.1.32) (2026-06-11)

## [0.1.31](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.30...v0.1.31) (2026-06-11)

## [0.1.30](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.28...v0.1.30) (2026-06-11)

## [0.1.29](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.28...v0.1.29) (2026-06-11)

## [0.1.28](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.27...v0.1.28) (2026-06-09)

## [0.1.27](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.26...v0.1.27) (2026-06-09)

## [0.1.26](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.25...v0.1.26) (2026-06-09)

## [0.1.25](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.24...v0.1.25) (2026-06-09)

## [0.1.24](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.23...v0.1.24) (2026-06-09)

## [0.1.23](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.22...v0.1.23) (2026-06-09)

## [0.1.22](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.21...v0.1.22) (2026-06-09)

## [0.1.21](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.20...v0.1.21) (2026-06-09)

## [0.1.20](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.19...v0.1.20) (2026-06-09)

## [0.1.19](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.17...v0.1.19) (2026-06-09)

## [0.1.18](https://github.com/Tarislowatsch/sr4foundry/compare/v0.1.17...v0.1.18) (2026-06-09)
