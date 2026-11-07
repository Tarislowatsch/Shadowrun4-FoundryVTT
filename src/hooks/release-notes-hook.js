import { SYSTEM_ID } from '@utils/game/system-id.js';
import { TEMPLATES, renderTemplate } from '@utils/templates';

const VERSIONS_KEY = 'sr4.releaseNotes.versions';
export const MAX_RELEASE_NOTE_VERSIONS = 4;

/**
 * @param {string} version
 * @returns {{ major: number, minor: number } | null}
 */
export function parseMinorLine(version) {
  const match = /^(\d+)\.(\d+)/.exec(version ?? '');
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

/**
 * @param {{ major: number, minor: number }} a
 * @param {{ major: number, minor: number }} b
 * @returns {number}
 */
function compareLines(a, b) {
  return a.major - b.major || a.minor - b.minor;
}

/**
 * @param {string} current
 * @param {string} lastSeen
 * @returns {boolean}
 */
export function isNewMinorLine(current, lastSeen) {
  const now = parseMinorLine(current);
  if (!now) return false;
  const seen = parseMinorLine(lastSeen);
  return !seen || compareLines(now, seen) > 0;
}

/**
 * @param {object} tree
 * @returns {Map<string, string[]>}
 */
function readVersions(tree) {
  const versions = new Map();
  const majors = foundry.utils.getProperty(tree ?? {}, VERSIONS_KEY) ?? {};
  for (const [major, minors] of Object.entries(majors)) {
    for (const [minor, entries] of Object.entries(minors ?? {})) {
      if (Array.isArray(entries) && entries.length) {
        versions.set(`${major}.${minor}`, entries);
      }
    }
  }
  return versions;
}

/**
 * @param {string} current
 * @param {string} lastSeen
 * @returns {{ version: string, entries: string[] }[]}
 */
export function getReleaseNotes(current, lastSeen) {
  const now = parseMinorLine(current);
  if (!now) return [];
  const seen = parseMinorLine(lastSeen);
  const notes = new Map([
    ...readVersions(game.i18n._fallback),
    ...readVersions(game.i18n.translations),
  ]);
  return [...notes]
    .map(([version, entries]) => ({
      version,
      line: parseMinorLine(version),
      entries,
    }))
    .filter(
      ({ line }) =>
        compareLines(line, now) <= 0 && (!seen || compareLines(line, seen) > 0)
    )
    .sort((a, b) => compareLines(b.line, a.line))
    .slice(0, MAX_RELEASE_NOTE_VERSIONS)
    .reverse()
    .map(({ version, entries }) => ({ version, entries }));
}

/**
 * @param {{ version: string }[]} sections
 * @returns {string}
 */
function versionRange(sections) {
  const oldest = sections[0].version;
  const newest = sections.at(-1).version;
  return newest === oldest ? newest : `${oldest} – ${newest}`;
}

export class ReleaseNotesHook {
  constructor() {
    Hooks.once('ready', () => this._run());
  }

  /**
   * @returns {Promise<void>}
   */
  async _run() {
    if (!game.users?.activeGM?.isSelf) return;
    const current = game.system.version;
    const lastSeen = game.settings.get(SYSTEM_ID, 'lastSeenSystemVersion');
    if (!isNewMinorLine(current, lastSeen)) return;

    await game.settings.set(SYSTEM_ID, 'lastSeenSystemVersion', current);

    const sections = getReleaseNotes(current, lastSeen);
    if (!sections.length) return;

    const content = await renderTemplate(TEMPLATES.ui.releaseNotes, {
      title: game.i18n.format('sr4.releaseNotes.title', {
        system: game.system.title,
        version: versionRange(sections),
      }),
      sections,
    });
    await ChatMessage.create({
      content,
      speaker: { alias: game.system.title },
    });
  }
}
