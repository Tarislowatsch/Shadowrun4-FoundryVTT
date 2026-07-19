const SOURCE_PATTERN =
  /^(.+?)(?:[,.\s]+(?:(?:page|p\.?|s\.?|seite)\s*)?(\d+))?[,.\s]*$/i;

/**
 * @param {string} source
 * @returns {{code: string, page?: number} | null}
 */
export function parseSourceReference(source) {
  if (!source) return null;
  const match = source.match(SOURCE_PATTERN);
  if (!match) return null;
  const code = match[1].trim();
  if (!code) return null;
  const page = match[2] ? Number(match[2]) : undefined;
  return { code, page };
}

/**
 * @returns {Record<string, string>}
 */
export function getSourceBookBindings() {
  try {
    return JSON.parse(
      game.settings.get('shadowrun4e', 'sourceBookBindings') || '{}'
    );
  } catch {
    return {};
  }
}

/**
 * Renders the bound page's parent journal sheet directly instead of going
 * through fvtt-pdf-pager's openPDFByCode/openPDFByName, since those match
 * by the PDF's own "code" field or by journal/page name — both independent
 * of how the GM labeled the book in this system's binding — and silently
 * fall back to the wrong lookup when the names don't line up.
 *
 * @param {string} source
 * @returns {void}
 */
export function openSourceReference(source) {
  const parsed = parseSourceReference(source);
  if (!parsed) return;
  if (!game.modules.get('pdf-pager')?.active) return;

  const uuid = getSourceBookBindings()[parsed.code];
  if (!uuid) {
    console.warn(`sr4 | No PDF bound for source code "${parsed.code}".`);
    return;
  }

  const page = fromUuidSync(uuid);
  if (!page?.parent?.sheet) {
    console.warn(
      `sr4 | Bound PDF page for source code "${parsed.code}" could not be resolved (uuid: ${uuid}).`
    );
    return;
  }

  page.parent.sheet.render(true, {
    pageId: page.id,
    anchor: parsed.page ? `page=${parsed.page}` : undefined,
  });
}
