import { DiceUtility } from '../../rolls';
import {
  createRollDialog,
  getInt,
  localize,
  renderTemplate,
} from '../dialogutility';
import { getGame } from '@utils/game/game.js';

const SPIRIT_RESIST_TEMPLATE =
  'systems/shadowrun4e/templates/magic/spirit-resist.hbs';

/**
 * @param {number} force
 * @param {string} spiritType
 * @param {'spirit' | 'sprite'} entityType
 * @param {string} summonerId
 * @returns {Promise<void>}
 */
export async function openSpiritResistDialog(
  force,
  spiritType,
  entityType,
  summonerId
) {
  const isSprite = entityType === 'sprite';
  const resistLabelKey = isSprite
    ? 'sr4.magic.spriteResistLabel'
    : 'sr4.magic.spiritResistLabel';
  const resistLabel = game.i18n
    .localize(resistLabelKey)
    .replace(isSprite ? '{rating}' : '{force}', String(force));

  const titleKey = isSprite
    ? 'sr4.magic.spriteResist'
    : 'sr4.magic.spiritResist';

  const content = await renderTemplate(SPIRIT_RESIST_TEMPLATE, { resistLabel });

  await createRollDialog({
    title: `${localize(titleKey)} — ${spiritType}`,
    content,
    dice: force,
    onRoll: async (dialog) => {
      const bonus = getInt(dialog, 'bonus');
      const malus = getInt(dialog, 'malus');
      const finalPool = Math.max(force + bonus - malus, 1);

      const result = await DiceUtility.rollAndShow({
        numDice: finalPool,
        explode: false,
        edgeAvailable: false,
        skillName: localize(titleKey),
        extended: false,
      });

      getGame().socket?.emit('system.shadowrun4e', {
        action: isSprite ? 'spriteResisted' : 'spiritResisted',
        payload: { summonerId, resistHits: result.successes },
      });

      return result;
    },
    autoRoll: true,
  });
}
