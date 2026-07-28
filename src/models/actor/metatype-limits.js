/** @type {Array<[string, string]>} */
const METATYPE_STAT_MAP = [
  ['body', 'BODY'],
  ['agility', 'AGILITY'],
  ['reaction', 'REACTION'],
  ['strength', 'STRENGTH'],
  ['charisma', 'CHARISMA'],
  ['intuition', 'INTUITION'],
  ['logic', 'LOGIC'],
  ['willpower', 'WILLPOWER'],
  ['edge', 'EDGE'],
  ['magic', 'MAGIC'],
  ['resonance', 'RESONANCE'],
  ['essence', 'ESSENCE'],
];

/**
 * @param {any} self
 * @param {Record<string, { min: number, max: number, aug: number }>} attrs
 */
export function applyMetatypeLimits(self, attrs) {
  /** @type {Record<string, number>} */
  const attributeMaximum = {};
  /** @type {Record<string, number>} */
  const augmentedMaximum = {};
  /** @type {Record<string, number>} */
  const attributeMinimum = {};

  const sourceStats = self._source?.sheetStats ?? {};
  const maximumBonus = self.modifiers?.attributeMaximum ?? {};

  for (const [mtKey, ssKey] of METATYPE_STAT_MAP) {
    const limit = attrs[mtKey];
    if (!limit) continue;
    const bonus = Number(maximumBonus[ssKey]) || 0;
    const max = limit.max + bonus;
    // SR4A: augmented maximum = floor(1.5 x natural maximum)
    const followsAugRule = limit.aug === Math.floor(limit.max * 1.5);
    const aug = followsAugRule ? Math.floor(max * 1.5) : limit.aug + bonus;
    attributeMinimum[ssKey] = limit.min;
    attributeMaximum[ssKey] = max;
    augmentedMaximum[ssKey] = aug;

    if (self.sheetStats[ssKey] === undefined) continue;
    const base = sourceStats[ssKey] ?? self.sheetStats[ssKey];
    const effectBonus = self.sheetStats[ssKey] - base;
    const clampedBase = Math.min(base, max);
    self.sheetStats[ssKey] = Math.max(
      limit.min,
      Math.min(clampedBase + effectBonus, aug)
    );
  }

  self.derivedStats.attributeMinimum = attributeMinimum;
  self.derivedStats.attributeMaximum = attributeMaximum;
  self.derivedStats.augmentedMaximum = augmentedMaximum;
}
