const RESIST_CONFIG = {
  summon: {
    spirit: {
      triggerAction: 'triggerSpiritResist',
      resistedAction: 'spiritResisted',
      titleKey: 'sr4.magic.spiritResist',
      labelKey: 'sr4.magic.spiritResistLabel',
    },
    sprite: {
      triggerAction: 'triggerSpriteResist',
      resistedAction: 'spriteResisted',
      titleKey: 'sr4.magic.spriteResist',
      labelKey: 'sr4.magic.spriteResistLabel',
    },
  },
  bind: {
    spirit: {
      triggerAction: 'triggerSpiritBindResist',
      resistedAction: 'spiritBindResisted',
      titleKey: 'sr4.magic.spiritBindResist',
      labelKey: 'sr4.magic.spiritBindResistLabel',
    },
    sprite: {
      triggerAction: 'triggerSpriteBindResist',
      resistedAction: 'spriteBindResisted',
      titleKey: 'sr4.magic.spriteBindResist',
      labelKey: 'sr4.magic.spriteBindResistLabel',
    },
  },
};

/**
 * @param {'summon' | 'bind'} mode
 * @param {'spirit' | 'sprite'} entityType
 * @returns {{ triggerAction: string, resistedAction: string, titleKey: string, labelKey: string }}
 */
export function getResistConfig(mode, entityType) {
  return RESIST_CONFIG[mode][entityType];
}
