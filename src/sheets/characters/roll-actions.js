import {
  openActionDialog,
  openAttributeRollDialog,
  openDerivedStatDialog,
  openMatrixActionDialog,
} from '@utils/index';
import { handleAttackRoll } from '@domains/combat/dialogs/index.js';
import { reloadWeapon } from '@domains/combat/weapons.js';
import { ActionCategory } from '@models/actions/actions.model';

export async function onAttackRoll(event, target) {
  const itemId = target.closest('[data-item-id]')?.dataset.itemId;
  const skillKey = target.dataset.attackSkill;
  if (!itemId || !skillKey) return;
  const weapon = this.actor.items.get(itemId);
  const skillName = this.actor.findByAttackSkill(skillKey)?.name;
  if (!skillName || !weapon) return;
  await handleAttackRoll(this.actor, skillName, weapon);
}

export async function onReloadWeapon(event, target) {
  const itemId = target.closest('[data-item-id]')?.dataset.itemId;
  if (!itemId) return;
  await reloadWeapon(this.actor, itemId);
}

export async function onRollAction(event, target) {
  const rating1 = Number(target.dataset.rating1) || 0;
  const rating2 = Number(target.dataset.rating2) || 0;
  const action1 = target.dataset.action1;
  const action2 = target.dataset.action2;
  const category = target.dataset.category;
  const itemId = target.closest('[data-item-id]')?.dataset.itemId;
  const item = this.actor.items.get(itemId);
  const numDice = rating1 + rating2;

  if (!item || numDice < 1) {
    ui?.notifications?.error(
      game.i18n.localize('sr4.action.noRatingForAction')
    );
    return;
  }

  const actionName = `${item.name} (${action1}${action2 ? ` + ${action2}` : ''})`;

  if (
    category === ActionCategory.MATRIX ||
    category === ActionCategory.RIGGING
  ) {
    return openMatrixActionDialog(this.actor, actionName, numDice, category);
  }

  return openActionDialog(this.actor, actionName, numDice);
}

export async function onRollDerivedStat(event, target) {
  const stat = target.dataset.stat;
  if (stat) await openDerivedStatDialog(this.actor, stat);
}

export async function onRollAttribute(event, target) {
  const attribute = target.dataset.attribute;
  if (attribute) await openAttributeRollDialog(this.actor, attribute);
}
