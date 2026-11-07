import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ReleaseNotesHook,
  MAX_RELEASE_NOTE_VERSIONS,
  getReleaseNotes,
  isNewMinorLine,
} from '../../src/hooks/release-notes-hook.js';

/**
 * @param {string} lang
 * @returns {object}
 */
function readLang(lang) {
  const file = path.join(
    process.cwd(),
    'src',
    'lang',
    `${lang}.release-notes.json`
  );
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * @param {object} versions
 * @returns {string[]}
 */
function versionKeys(versions) {
  return Object.entries(versions).flatMap(([major, minors]) =>
    Object.keys(minors).map((minor) => `${major}.${minor}`)
  );
}

/**
 * @param {object} versions
 * @returns {object}
 */
function translationTree(versions) {
  return Object.fromEntries([['sr4', { releaseNotes: { versions } }]]);
}

describe('isNewMinorLine', () => {
  it.each([
    ['1.28.0', '', true],
    ['1.28.0', '1.27.2', true],
    ['2.0.0', '1.28.3', true],
    ['1.28.3', '1.28.0', false],
    ['1.28.0', '1.28.0', false],
    ['1.27.0', '1.28.0', false],
    ['1.28.0', '2.0.0', false],
    ['', '1.28.0', false],
  ])('%s after %s -> %s', (current, lastSeen, expected) => {
    expect(isNewMinorLine(current, lastSeen)).toBe(expected);
  });
});

describe('release notes lang files', () => {
  it('keeps the same versions in en and de', () => {
    const en = versionKeys(readLang('en').sr4.releaseNotes.versions);
    const de = versionKeys(readLang('de').sr4.releaseNotes.versions);

    expect(de.sort()).toEqual(en.sort());
  });

  it('stores every version as a non-empty list of strings', () => {
    for (const lang of ['en', 'de']) {
      const { versions } = readLang(lang).sr4.releaseNotes;
      for (const key of versionKeys(versions)) {
        const [major, minor] = key.split('.');
        const entries = versions[major][minor];
        expect(Array.isArray(entries) && entries.length > 0).toBe(true);
        expect(entries.every((entry) => typeof entry === 'string')).toBe(true);
      }
    }
  });
});

describe('ReleaseNotesHook', () => {
  let readyHandler;
  let settings;

  beforeEach(() => {
    settings = new Map();
    vi.stubGlobal('Hooks', {
      once: (event, handler) => {
        if (event === 'ready') readyHandler = handler;
      },
    });
    vi.stubGlobal('ChatMessage', { create: vi.fn() });
    vi.stubGlobal('foundry', {
      ...foundry,
      applications: {
        handlebars: {
          renderTemplate: vi.fn(async (_path, data) => JSON.stringify(data)),
        },
      },
    });
    vi.stubGlobal('game', {
      i18n: {
        format: (key, { version }) => `${key} ${version}`,
        translations: translationTree({ 1: { 27: ['Alt'], 28: ['Neu'] } }),
        _fallback: translationTree({
          1: { 26: ['Older'], 27: ['Old'], 28: ['New'], 29: ['Next'] },
        }),
      },
      users: { activeGM: { isSelf: true } },
      system: { version: '1.28.0', title: 'Shadowrun 4th Edition' },
      settings: {
        get: (_namespace, key) => settings.get(key) ?? '',
        set: vi.fn(async (_namespace, key, value) => settings.set(key, value)),
      },
    });
    new ReleaseNotesHook();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the notes once for a new minor line', async () => {
    settings.set('lastSeenSystemVersion', '1.27.2');

    await readyHandler();

    expect(ChatMessage.create).toHaveBeenCalledTimes(1);
    const { content, speaker } = ChatMessage.create.mock.calls[0][0];
    expect(JSON.parse(content)).toEqual({
      title: 'sr4.releaseNotes.title 1.28',
      sections: [{ version: '1.28', entries: ['Neu'] }],
    });
    expect(speaker).toEqual({ alias: 'Shadowrun 4th Edition' });
    expect(settings.get('lastSeenSystemVersion')).toBe('1.28.0');

    await readyHandler();
    expect(ChatMessage.create).toHaveBeenCalledTimes(1);
  });

  it('posts skipped minor lines in one message titled with the version range', async () => {
    settings.set('lastSeenSystemVersion', '1.26.3');

    await readyHandler();

    expect(ChatMessage.create).toHaveBeenCalledTimes(1);
    const { content } = ChatMessage.create.mock.calls[0][0];
    expect(JSON.parse(content).title).toBe(
      'sr4.releaseNotes.title 1.27 – 1.28'
    );
  });

  it('stays silent for a patch of an already seen minor line', async () => {
    settings.set('lastSeenSystemVersion', '1.28.0');
    game.system.version = '1.28.2';

    await readyHandler();

    expect(ChatMessage.create).not.toHaveBeenCalled();
  });

  it('only posts from the active GM', async () => {
    game.users.activeGM.isSelf = false;

    await readyHandler();

    expect(ChatMessage.create).not.toHaveBeenCalled();
    expect(game.settings.set).not.toHaveBeenCalled();
  });

  it('marks the version as seen even without notes', async () => {
    settings.set('lastSeenSystemVersion', '1.29.0');
    game.system.version = '1.30.0';

    await readyHandler();

    expect(ChatMessage.create).not.toHaveBeenCalled();
    expect(settings.get('lastSeenSystemVersion')).toBe('1.30.0');
  });

  it('collects every skipped minor line, oldest first', () => {
    expect(getReleaseNotes('1.28.1', '1.26.3')).toEqual([
      { version: '1.27', entries: ['Alt'] },
      { version: '1.28', entries: ['Neu'] },
    ]);
  });

  it('collects every known version up to the current one when nothing was seen', () => {
    expect(getReleaseNotes('1.28.0', '')).toEqual([
      { version: '1.26', entries: ['Older'] },
      { version: '1.27', entries: ['Alt'] },
      { version: '1.28', entries: ['Neu'] },
    ]);
  });

  it('limits the notes to the newest versions', () => {
    game.i18n.translations = {};
    game.i18n._fallback = translationTree({
      1: Object.fromEntries(
        [24, 25, 26, 27, 28, 29].map((minor) => [minor, [`v${minor}`]])
      ),
    });

    const versions = getReleaseNotes('1.29.0', '').map((n) => n.version);

    expect(versions).toHaveLength(MAX_RELEASE_NOTE_VERSIONS);
    expect(versions).toEqual(['1.26', '1.27', '1.28', '1.29']);
  });

  it('falls back to English notes', () => {
    expect(getReleaseNotes('1.29.0', '1.28.0')).toEqual([
      { version: '1.29', entries: ['Next'] },
    ]);
  });
});
