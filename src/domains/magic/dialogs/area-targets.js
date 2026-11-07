import { TEMPLATES, renderTemplate } from '@utils/templates';
import { localize, promptDialog } from '@utils/dialog';

/**
 * @template {{ uuid: string }} T
 * @param {T[]} actors
 * @param {string[]} checkedUuids
 * @returns {T[]}
 */
export function selectAreaTargets(actors, checkedUuids) {
  const checked = new Set(checkedUuids);
  return actors.filter((actor) => checked.has(actor.uuid));
}

/**
 * @param {import('@documents/index').SR4Actor[]} actors
 * @param {{ fallback?: boolean }} [options]
 * @returns {Promise<import('@documents/index').SR4Actor[] | null>}
 */
export async function confirmAreaTargets(actors, { fallback = false } = {}) {
  const prefix = fallback ? 'sr4.spell.markedTargets' : 'sr4.spell.areaTargets';
  const content = await renderTemplate(TEMPLATES.magic.areaTargets, {
    actors,
    hint: `${prefix}Hint`,
  });

  const result = await promptDialog({
    window: { title: localize(`${prefix}Title`) },
    content,
    ok: {
      label: localize('sr4.spell.cast'),
      callback: (
        /** @type {Event} */ _event,
        /** @type {HTMLButtonElement} */ button
      ) => {
        const root = /** @type {HTMLElement} */ (button.closest('dialog'));
        const checked = [
          ...root.querySelectorAll('input[name="areaTarget"]:checked'),
        ].map((input) => /** @type {HTMLInputElement} */ (input).value);
        return selectAreaTargets(actors, checked);
      },
    },
  });
  return result ?? null;
}
