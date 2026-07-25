// @ts-nocheck
import { parseTranslationData } from '@importer/translation/parse-name-translations.js';
import { translateExistingPack } from '@importer/translation/translate-existing-pack.js';
import {
  detectLanguageFromFilename,
  normalizeLangCode,
} from '@importer/translation/detect-language.js';
import { registerItemNameTranslations } from '@utils/item-name-translations.js';

const ALL_PACKS_VALUE = '__all__';

/**
 * @typedef {object} TranslatePackPreset
 * @property {File} file
 * @property {import('@importer/translation/parse-name-translations.js').TranslationData} translations
 * @property {string} lang
 */

/**
 * @param {TranslatePackPreset} [preset]
 * @returns {Promise<void>}
 */
export async function openTranslatePackDialog(preset) {
  const packs = game.packs.filter(
    (p) => p.metadata.type === 'Item' && p.metadata.packageType === 'world'
  );
  if (packs.length === 0) {
    ui.notifications.info(game.i18n.localize('sr4.importer.translatePackNone'));
    return;
  }

  const options = [
    `<option value="${ALL_PACKS_VALUE}">${game.i18n.localize('sr4.importer.translatePackAll')}</option>`,
    ...packs.map(
      (p) =>
        `<option value="${p.collection}">${foundry.utils.escapeHTML(p.metadata.label)}</option>`
    ),
  ].join('');
  const fileSection = preset
    ? `<p>${game.i18n.format('sr4.importer.translatePackUsingFile', {
        file: foundry.utils.escapeHTML(preset.file?.name ?? ''),
        lang: foundry.utils.escapeHTML(preset.lang),
      })}</p>`
    : `
      <div class="form-group">
        <label>${game.i18n.localize('sr4.importer.translatePackFileLabel')}</label>
        <input type="file" name="translationFile" accept=".xml" required />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize('sr4.importer.translationLangLabel')}</label>
        <input type="text" name="translationLang" maxlength="5" />
      </div>
    `;
  const content = `
    <form class="sr4-translate-pack">
      <div class="form-group">
        <label>${game.i18n.localize('sr4.importer.translatePackLabel')}</label>
        <select name="pack">${options}</select>
      </div>
      ${fileSection}
    </form>
  `;

  await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('sr4.importer.translatePackTitle') },
    content,
    render: preset
      ? undefined
      : (_event, dialog) => {
          const fileInput = dialog.element.querySelector(
            'input[name="translationFile"]'
          );
          const langInput = dialog.element.querySelector(
            'input[name="translationLang"]'
          );
          fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (!file || !langInput) return;
            langInput.value = detectLanguageFromFilename(file.name) ?? '';
          });
        },
    ok: {
      label: game.i18n.localize('sr4.importer.translatePackButton'),
      callback: async (_event, button) => {
        const dialog = button.closest('dialog');
        const packId = dialog?.querySelector('select[name="pack"]')?.value;
        if (!packId) return;

        let translations;
        let lang;
        if (preset) {
          ({ translations, lang } = preset);
        } else {
          const file = dialog?.querySelector('input[name="translationFile"]')
            ?.files?.[0];
          if (!file) return;

          lang =
            normalizeLangCode(
              dialog?.querySelector('input[name="translationLang"]')?.value
            ) || detectLanguageFromFilename(file.name);
          if (!lang) {
            ui.notifications.error(
              game.i18n.format('sr4.importer.translationLangUnknown', {
                file: file.name,
              })
            );
            return;
          }

          try {
            translations = parseTranslationData(await file.text());
          } catch (err) {
            ui.notifications.error(
              game.i18n.format('sr4.importer.translationParseError', {
                file: file.name,
                error: err.message,
              })
            );
            return;
          }
        }

        if (packId === ALL_PACKS_VALUE) {
          let total = 0;
          const failed = [];
          for (const pack of packs) {
            try {
              const entries = await translateExistingPack(
                pack,
                translations,
                lang
              );
              await registerItemNameTranslations(entries);
              total += entries.length;
            } catch (err) {
              failed.push(pack.metadata.label);
              console.error(
                `SR4 | Importer: failed to translate pack ${pack.collection}`,
                err
              );
            }
          }
          if (failed.length > 0) {
            ui.notifications.warn(
              game.i18n.format('sr4.importer.translatePackAllPartial', {
                count: total,
                failed: failed.join(', '),
              })
            );
          } else {
            ui.notifications.info(
              game.i18n.format('sr4.importer.translatePackAllResult', {
                count: total,
                packCount: packs.length,
              })
            );
          }
          return;
        }

        const pack = game.packs.get(packId);
        if (!pack) return;
        try {
          const entries = await translateExistingPack(pack, translations, lang);
          await registerItemNameTranslations(entries);
          ui.notifications.info(
            game.i18n.format('sr4.importer.translatePackResult', {
              count: entries.length,
              pack: pack.metadata.label,
            })
          );
        } catch (err) {
          ui.notifications.error(
            game.i18n.format('sr4.importer.translatePackError', {
              pack: pack.metadata.label,
              error: err.message,
            })
          );
        }
      },
    },
    cancel: { label: game.i18n.localize('sr4.cancel') },
  });
}
