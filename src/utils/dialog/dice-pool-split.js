import { TEMPLATES, renderTemplate } from '@utils/templates';
import { localize } from './roll-dialog-core.js';
import { getChecked, createEdgePayment } from './pool-math.js';
import { promptDialog } from './dialog-v2.js';

/**
 * @typedef {object} SplitTarget
 * @property {string} id
 * @property {string} name
 * @property {number} [essencePenalty]
 */

/**
 * @typedef {object} SplitAllocation
 * @property {string} targetId
 * @property {number} allocatedDice
 * @property {import('./pool-math.js').EdgePayment | null} edgePayment
 */

/**
 * @typedef {object} SplitResult
 * @property {SplitAllocation[]} allocations
 */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} totalDice
 * @param {SplitTarget[]} targets
 * @param {string} label
 * @returns {Promise<SplitResult | null>}
 */
export async function openDicePoolSplitDialog(
  actor,
  totalDice,
  targets,
  label
) {
  if (totalDice < targets.length) {
    ui?.notifications?.warn(localize('sr4.roll.splitHint'));
    return null;
  }
  const currentEdge = actor.getAttribute('CURRENTEDGE');
  const maxEdge = actor.getAttribute('EDGE');
  const edgeAvailable = currentEdge > 0 && maxEdge > 0;

  const perTarget = Math.max(1, Math.floor(totalDice / targets.length));
  const entries = targets.map((t, i) => ({
    ...t,
    initial: i === 0 ? totalDice - perTarget * (targets.length - 1) : perTarget,
  }));
  const remaining = totalDice - entries.reduce((sum, e) => sum + e.initial, 0);

  const content = await renderTemplate(TEMPLATES.ui.dialogs.dicePoolSplit, {
    totalDice,
    remaining,
    targets: entries,
    edgeAvailable,
    currentEdge,
    maxEdge,
  });

  const result = await promptDialog({
    window: { title: `${localize('sr4.roll.splitPool')} — ${label}` },
    content,
    render: (event) => {
      const html = event.target.element;
      const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (
        html.querySelectorAll('.split-dice')
      );
      const edgeBox = /** @type {HTMLInputElement | null} */ (
        html.querySelector('#splitEdge')
      );
      const totalEl = html.querySelector('#splitTotalDice');
      const remainingEl = html.querySelector('#remainingDice');
      const okBtn = html.querySelector('button[data-action="ok"]');

      const update = () => {
        const available = totalDice + (edgeBox?.checked ? maxEdge : 0);
        let sum = 0;
        inputs.forEach((inp) => {
          const clamped = Math.max(1, parseInt(inp.value) || 1);
          if (parseInt(inp.value) !== clamped) inp.value = String(clamped);
          inp.max = String(available);
          sum += clamped;
        });
        const left = available - sum;
        if (totalEl) totalEl.textContent = String(available);
        if (remainingEl) remainingEl.textContent = String(left);
        if (okBtn) okBtn.disabled = left !== 0;
      };
      inputs.forEach((inp) => inp.addEventListener('change', update));
      edgeBox?.addEventListener('change', update);
      update();
    },
    ok: {
      label: localize('sr4.roll.rollButton'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        if (!dialog) return null;
        const edgePayment = getChecked(
          /** @type {HTMLElement} */ (dialog),
          'splitEdge'
        )
          ? createEdgePayment()
          : null;
        /** @type {SplitAllocation[]} */
        const allocations = [];
        for (const t of targets) {
          const inp = /** @type {HTMLInputElement | null} */ (
            dialog.querySelector(`[name="dice-${t.id}"]`)
          );
          const dice = Math.max(1, parseInt(inp?.value ?? '1') || 1);
          allocations.push({
            targetId: t.id,
            allocatedDice: dice,
            edgePayment,
          });
        }
        return { allocations };
      },
    },
    cancel: {
      label: localize('sr4.cancel'),
      callback: () => null,
    },
  });

  if (result === null || result === undefined) return null;
  return result;
}

/**
 * @typedef {object} TargetAllocation
 * @property {import('@documents/index').SR4Actor | undefined} target
 * @property {string} targetUuid
 * @property {number} allocatedDice
 * @property {import('./pool-math.js').EdgePayment | null} edgePayment
 */

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {number} dice
 * @param {import('@documents/index').SR4Actor[]} targets
 * @param {string} weaponName
 * @returns {Promise<TargetAllocation[] | null>}
 */
export async function splitDiceAcrossTargets(actor, dice, targets, weaponName) {
  const splitTargets = targets.map((t) => ({
    id: /** @type {any} */ (t).uuid ?? '',
    name: t.name,
  }));
  const result = await openDicePoolSplitDialog(
    actor,
    dice,
    splitTargets,
    weaponName
  );
  if (result === null || result === undefined) return null;
  return result.allocations.map(({ targetId, allocatedDice, edgePayment }) => ({
    target: targets.find((a) => /** @type {any} */ (a).uuid === targetId),
    targetUuid: targetId,
    allocatedDice,
    edgePayment,
  }));
}
