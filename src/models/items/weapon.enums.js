/**
 * @enum {string}
 * @readonly
 */
export const RangedAttackskill = Object.freeze({
  /** @type {string} */ NONE: 'sr4.attack.none',
  /** @type {string} */ PISTOLS: 'sr4.skills.pistols',
  /** @type {string} */ AUTOMATICS: 'sr4.skills.automatics',
  /** @type {string} */ THROWING: 'sr4.skills.throwingweapons',
  /** @type {string} */ ARCHERY: 'sr4.skills.archery',
  /** @type {string} */ HEAVY_WEAPONS: 'sr4.skills.heavyweapons',
  /** @type {string} */ LONGARMS: 'sr4.skills.longarms',
  /** @type {string} */ GUNNERY: 'sr4.skills.gunnery',
  /** @type {string} */ EXOTIC_RANGED: 'sr4.skills.exoticrangedweapon',
});

/**
 * @enum {string}
 * @readonly
 */
export const MeleeAttackskill = Object.freeze({
  /** @type {string} */ NONE: 'sr4.attack.none',
  /** @type {string} */ BLADES: 'sr4.skills.blades',
  /** @type {string} */ CLUBS: 'sr4.skills.clubs',
  /** @type {string} */ UNARMED: 'sr4.skills.unarmedcombat',
  /** @type {string} */ EXOTIC_MELEE: 'sr4.skills.exoticmeleeweapon',
});

/**
 * @enum {string}
 * @readonly
 */
export const Attackskill = Object.freeze({
  ...RangedAttackskill,
  ...MeleeAttackskill,
});

/**
 * @enum {string}
 * @readonly
 */
export const Shootingmodes = Object.freeze({
  /** @type {string} */ SINGLE_SHOT: 'sr4.shooting.single',
  /** @type {string} */ SEMI_AUTOMATIC: 'sr4.shooting.semi',
  /** @type {string} */ BURST_FIRE: 'sr4.shooting.burst',
  /** @type {string} */ FULL_AUTO: 'sr4.shooting.full',
  /** @type {string} */ SINGLE_SEMI: 'sr4.shooting.single-semi',
  /** @type {string} */ SINGLE_SEMI_BURST: 'sr4.shooting.single-semi-burst',
  /** @type {string} */ SINGLE_SEMI_BURST_FULL_AUTO:
    'sr4.shooting.single-semi-burst-full',
  /** @type {string} */ BURST_FULL_AUTO: 'sr4.shooting.burst-full',
  /** @type {string} */ SEMI_BURST: 'sr4.shooting.semi-burst',
  /** @type {string} */ SEMI_BURST_FULL_AUTO: 'sr4.shooting.semi-burst-full',
});

/**
 * @enum {string}
 * @readonly
 */
export const WeaponMountPoints = Object.freeze({
  /** @type {string} */ top: 'sr4.weaponmod.mountPoints.top',
  /** @type {string} */ barrel: 'sr4.weaponmod.mountPoints.barrel',
  /** @type {string} */ under: 'sr4.weaponmod.mountPoints.under',
  /** @type {string} */ internal: 'sr4.weaponmod.mountPoints.internal',
});

/**
 * @enum {string}
 * @readonly
 */
export const WeaponCategory = Object.freeze({
  /** @type {string} */ BLADES: 'sr4.category.blades',
  /** @type {string} */ CLUBS: 'sr4.category.clubs',
  /** @type {string} */ EXOTIC_MELEE_WEAPONS: 'sr4.category.exoticMeleeWeapons',
  /** @type {string} */ EXOTIC_RANGED_WEAPONS:
    'sr4.category.exoticRangedWeapons',
  /** @type {string} */ UNARMED: 'sr4.category.unarmed',
  /** @type {string} */ BOWS: 'sr4.category.bows',
  /** @type {string} */ CROSSBOWS: 'sr4.category.crossbows',
  /** @type {string} */ THROWING_WEAPONS: 'sr4.category.throwingWeapons',
  /** @type {string} */ TASERS: 'sr4.category.tasers',
  /** @type {string} */ HOLDOUTS: 'sr4.category.holdouts',
  /** @type {string} */ LIGHT_PISTOLS: 'sr4.category.lightPistols',
  /** @type {string} */ HEAVY_PISTOLS: 'sr4.category.heavyPistols',
  /** @type {string} */ MACHINE_PISTOLS: 'sr4.category.machinePistols',
  /** @type {string} */ SUBMACHINE_GUNS: 'sr4.category.submachineGuns',
  /** @type {string} */ ASSAULT_RIFLES: 'sr4.category.assaultRifles',
  /** @type {string} */ BATTLE_RIFLES: 'sr4.category.battleRifles',
  /** @type {string} */ SPORTS_RIFLES: 'sr4.category.sportsRifles',
  /** @type {string} */ SNIPER_RIFLES: 'sr4.category.sniperRifles',
  /** @type {string} */ SHOTGUNS: 'sr4.category.shotguns',
  /** @type {string} */ SPECIAL_WEAPONS: 'sr4.category.specialWeapons',
  /** @type {string} */ LIGHT_MACHINE_GUNS: 'sr4.category.lightMachineGuns',
  /** @type {string} */ MEDIUM_MACHINE_GUNS: 'sr4.category.mediumMachineGuns',
  /** @type {string} */ HEAVY_MACHINE_GUNS: 'sr4.category.heavyMachineGuns',
  /** @type {string} */ ASSAULT_CANNONS: 'sr4.category.assaultCannons',
  /** @type {string} */ FLAMETHROWERS: 'sr4.category.flamethrowers',
  /** @type {string} */ LASER_WEAPONS: 'sr4.category.laserWeapons',
  /** @type {string} */ GRENADE_LAUNCHERS: 'sr4.category.grenadeLaunchers',
  /** @type {string} */ MORTAR_LAUNCHERS: 'sr4.category.mortarLaunchers',
  /** @type {string} */ MISSILE_LAUNCHERS: 'sr4.category.missileLaunchers',
  /** @type {string} */ VEHICLE_WEAPONS: 'sr4.category.vehicleWeapons',
  /** @type {string} */ GEAR: 'sr4.category.gear',
  /** @type {string} */ UNDERBARREL_WEAPONS: 'sr4.category.underbarrelWeapons',
  /** @type {string} */ CYBERWARE: 'sr4.category.cyberware',
});

/**
 * @enum {string}
 * @readonly
 */
export const AmmoCategory = Object.freeze({
  /** @type {string} */ TASERS: 'sr4.category.tasers',
  /** @type {string} */ HOLDOUTS: 'sr4.category.holdouts',
  /** @type {string} */ LIGHT_PISTOLS: 'sr4.category.lightPistols',
  /** @type {string} */ HEAVY_PISTOLS: 'sr4.category.heavyPistols',
  /** @type {string} */ MACHINE_PISTOLS: 'sr4.category.machinePistols',
  /** @type {string} */ SUBMACHINE_GUNS: 'sr4.category.submachineGuns',
  /** @type {string} */ ASSAULT_RIFLES: 'sr4.category.assaultRifles',
  /** @type {string} */ BATTLE_RIFLES: 'sr4.category.battleRifles',
  /** @type {string} */ SPORTS_RIFLES: 'sr4.category.sportsRifles',
  /** @type {string} */ SNIPER_RIFLES: 'sr4.category.sniperRifles',
  /** @type {string} */ SHOTGUNS: 'sr4.category.shotguns',
  /** @type {string} */ LIGHT_MACHINE_GUNS: 'sr4.category.lightMachineGuns',
  /** @type {string} */ MEDIUM_MACHINE_GUNS: 'sr4.category.mediumMachineGuns',
  /** @type {string} */ HEAVY_MACHINE_GUNS: 'sr4.category.heavyMachineGuns',
  /** @type {string} */ ASSAULT_CANNONS: 'sr4.category.assaultCannons',
  /** @type {string} */ GRENADE_LAUNCHERS: 'sr4.category.grenadeLaunchers',
  /** @type {string} */ MISSILE_LAUNCHERS: 'sr4.category.missileLaunchers',
});

/**
 * @enum {string}
 * @readonly
 */
export const DamageTypes = Object.freeze({
  /** @type {string} */ PHYSICAL: 'sr4.damage.physical',
  /** @type {string} */ STUN: 'sr4.damage.stun',
  /** @type {string} */ ELECTRICITY: 'sr4.damage.electricity',
  /** @type {string} */ FIRE: 'sr4.damage.fire',
  /** @type {string} */ LASER: 'sr4.damage.laser',
  /** @type {string} */ BLAST: 'sr4.damage.blast',
  /** @type {string} */ LIGHT: 'sr4.damage.light',
  /** @type {string} */ STUN_HALF: 'sr4.damage.stun_half',
  /** @type {string} */ ACID: 'sr4.damage.acid',
  /** @type {string} */ RADIATION: 'sr4.damage.radiation',
  /** @type {string} */ SOUND: 'sr4.damage.sound',
  /** @type {string} */ ICE: 'sr4.damage.ice',
  /** @type {string} */ METAL: 'sr4.damage.metal',
  /** @type {string} */ SAND: 'sr4.damage.sand',
  /** @type {string} */ SMOKE: 'sr4.damage.smoke',
  /** @type {string} */ WATER: 'sr4.damage.water',
});
