import { DiceUtility } from '../../rolls';
import {
  createRollDialog,
  getInt,
  localize,
  renderTemplate,
} from '../dialogutility';
import { getGame } from '@utils/game/game.js';
import { getResistConfig } from './resist-actions.js';

const SPIRIT_RESIST_TEMPLATE =
  'systems/shadowrun4e/templates/magic/spirit-resist.hbs';

/**
 * @param {number} force
 * @param {string} spiritType
 * @param {'spirit' | 'sprite'} entityType
 * @param {string} summonerId
 * @param {'summon' | 'bind'} [mode]
 * @returns {Promise<void>}
 */
export async function openSpiritResistDialog(
  force,
  spiritType,
  entityType,
  summonerId,
  mode = 'summon'
) {
  const isSprite = entityType === 'sprite';
  const isBind = mode === 'bind';
  const { titleKey, labelKey, resistedAction } = getResistConfig(
    mode,
    entityType
  );
  const resistLabel = game.i18n
    .localize(labelKey)
    .replace(isSprite ? '{rating}' : '{force}', String(force));

  const dicePool = isBind ? force * 2 : force;

  const content = await renderTemplate(SPIRIT_RESIST_TEMPLATE, { resistLabel });

  await createRollDialog({
    title: `${localize(titleKey)} — ${spiritType}`,
    content,
    dice: dicePool,
    onRoll: async (dialog) => {
      const bonus = getInt(dialog, 'bonus');
      const malus = getInt(dialog, 'malus');
      const finalPool = Math.max(dicePool + bonus - malus, 1);

      const result = await DiceUtility.rollAndShow({
        numDice: finalPool,
        explode: false,
        edgeAvailable: false,
        skillName: localize(titleKey),
        extended: false,
      });

      getGame().socket?.emit('system.shadowrun4e', {
        action: resistedAction,
        payload: { summonerId, resistHits: result.successes },
      });

      return result;
    },
    autoRoll: true,
  });
}
