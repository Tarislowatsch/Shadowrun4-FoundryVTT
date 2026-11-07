import { describe, it, expect, vi, beforeEach } from 'vitest';

const promptDialogMock = vi.fn();
const renderTemplateMock = vi.fn(async () => '<form></form>');

vi.mock('@utils/templates', () => ({
  TEMPLATES: { magic: { areaTargets: 'area-targets.hbs' } },
  renderTemplate: (...args) => renderTemplateMock(...args),
}));

vi.mock('@utils/dialog', () => ({
  localize: (key) => key,
  promptDialog: (...args) => promptDialogMock(...args),
}));

const { confirmAreaTargets, selectAreaTargets } = await import(
  '../src/domains/magic/dialogs/area-targets.js'
);

const a = { uuid: 'Actor.a', name: 'A' };
const b = { uuid: 'Actor.b', name: 'B' };
const c = { uuid: 'Actor.c', name: 'C' };

function buttonWithChecked(uuids) {
  const root = {
    querySelectorAll: (selector) =>
      selector === 'input[name="areaTarget"]:checked'
        ? uuids.map((value) => ({ value }))
        : [],
  };
  return { closest: (selector) => (selector === 'dialog' ? root : null) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('selectAreaTargets', () => {
  it('keeps the checked actors in area order', () => {
    expect(selectAreaTargets([a, b, c], ['Actor.c', 'Actor.a'])).toEqual([
      a,
      c,
    ]);
  });

  it('returns no targets when nothing is checked', () => {
    expect(selectAreaTargets([a, b], [])).toEqual([]);
  });
});

describe('confirmAreaTargets', () => {
  it('lists every actor in the area, all preselected', async () => {
    promptDialogMock.mockResolvedValue(null);

    await confirmAreaTargets([a, b]);

    expect(renderTemplateMock).toHaveBeenCalledWith('area-targets.hbs', {
      actors: [a, b],
      hint: 'sr4.spell.areaTargetsHint',
    });
  });

  it('returns the actors still checked on confirm', async () => {
    promptDialogMock.mockImplementation(async (config) =>
      config.ok.callback(null, buttonWithChecked(['Actor.b']))
    );

    await expect(confirmAreaTargets([a, b])).resolves.toEqual([b]);
  });

  it('titles the dialog for targets in the area by default', async () => {
    promptDialogMock.mockResolvedValue(null);

    await confirmAreaTargets([a]);

    expect(promptDialogMock.mock.calls[0][0].window.title).toBe(
      'sr4.spell.areaTargetsTitle'
    );
  });

  it('titles the dialog for marked targets after a dismissed placement', async () => {
    promptDialogMock.mockResolvedValue(null);

    await confirmAreaTargets([a], { fallback: true });

    expect(promptDialogMock.mock.calls[0][0].window.title).toBe(
      'sr4.spell.markedTargetsTitle'
    );
    expect(renderTemplateMock).toHaveBeenCalledWith('area-targets.hbs', {
      actors: [a],
      hint: 'sr4.spell.markedTargetsHint',
    });
  });

  it('returns null when the dialog is cancelled', async () => {
    promptDialogMock.mockResolvedValue(null);

    await expect(confirmAreaTargets([a, b])).resolves.toBeNull();
  });
});
