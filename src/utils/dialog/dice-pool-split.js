import { localize } from './dialogutility';

const SPLIT_TEMPLATE = 'systems/shadowrun4e/templates/dice-pool-split.hbs';

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
 */

/**
 * @param {number} totalDice
 * @param {SplitTarget[]} targets
 * @param {string} label
 * @returns {Promise<SplitAllocation[] | null>}
 */
export async function openDicePoolSplitDialog(totalDice, targets, label) {
  if (totalDice < targets.length) {
    ui?.notifications?.warn(localize('sr4.roll.splitHint'));
    return null;
  }
  const perTarget = Math.max(1, Math.floor(totalDice / targets.length));
  const entries = targets.map((t, i) => ({
    ...t,
    initial: i === 0 ? totalDice - perTarget * (targets.length - 1) : perTarget,
  }));
  const remaining = totalDice - entries.reduce((sum, e) => sum + e.initial, 0);

  const content = await foundry.applications.handlebars.renderTemplate(
    SPLIT_TEMPLATE,
    { totalDice, remaining, targets: entries }
  );

  return foundry.applications.api.DialogV2.prompt({
    window: { title: `${localize('sr4.roll.splitPool')} — ${label}` },
    content,
    render: (event) => {
      const html = event.target.element;
      const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (
        html.querySelectorAll('.split-dice')
      );
      const remainingEl = html.querySelector('#remainingDice');
      const okBtn = html.querySelector('button[data-action="ok"]');

      const update = () => {
        let sum = 0;
        inputs.forEach((inp) => {
          const clamped = Math.max(1, parseInt(inp.value) || 1);
          if (parseInt(inp.value) !== clamped) inp.value = String(clamped);
          sum += clamped;
        });
        const left = totalDice - sum;
        if (remainingEl) remainingEl.textContent = String(left);
        if (okBtn) okBtn.disabled = left !== 0;
      };
      inputs.forEach((inp) => inp.addEventListener('change', update));
      update();
    },
    ok: {
      label: localize('sr4.roll.rollButton'),
      callback: (_event, button) => {
        const dialog = button.closest('dialog');
        if (!dialog) return null;
        /** @type {SplitAllocation[]} */
        const result = [];
        for (const t of targets) {
          const inp = /** @type {HTMLInputElement | null} */ (
            dialog.querySelector(`[name="dice-${t.id}"]`)
          );
          const dice = Math.max(1, parseInt(inp?.value ?? '1') || 1);
          result.push({ targetId: t.id, allocatedDice: dice });
        }
        return result;
      },
    },
    cancel: {
      label: localize('sr4.cancel'),
      callback: () => null,
    },
  });
}
