import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const renderTemplateMock = vi.fn();

vi.mock('@utils/templates', () => ({
  TEMPLATES: { magic: { resistSummary: 'resist-summary.hbs' } },
  renderTemplate: (...args) => renderTemplateMock(...args),
}));

const {
  ResistOutcome,
  buildResistSummaryRows,
  mergeCastOutcomes,
  resistOutcome,
  sendResistSummary,
} = await import('../src/domains/magic/resist-summary.js');

const createMock = vi.fn();
const getSpeakerMock = vi.fn(() => ({ alias: 'Caster' }));

const targetA = { name: 'Ganger A' };
const targetB = { name: 'Ganger B' };

beforeEach(() => {
  vi.clearAllMocks();
  renderTemplateMock.mockResolvedValue('<div>summary</div>');
  globalThis.ChatMessage = { create: createMock, getSpeaker: getSpeakerMock };
});

afterEach(() => {
  delete globalThis.ChatMessage;
});

const format = (key, params) => `${key}:${JSON.stringify(params ?? {})}`;

describe('buildResistSummaryRows', () => {
  it.each([
    [ResistOutcome.NO_HITS, 0, 'sr4.spell.resistSummary.noHits'],
    [ResistOutcome.RESISTED, 0, 'sr4.spell.resistSummary.resisted'],
    [ResistOutcome.AFFECTED, 2, 'sr4.spell.resistSummary.affected.other'],
    [ResistOutcome.AFFECTED, 1, 'sr4.spell.resistSummary.affected.one'],
    [
      ResistOutcome.DEFENSE_REQUESTED,
      3,
      'sr4.spell.resistSummary.defenseRequested.other',
    ],
    [
      ResistOutcome.DEFENSE_REQUESTED,
      1,
      'sr4.spell.resistSummary.defenseRequested.one',
    ],
  ])('describes %s with %i hits', (kind, hits, key) => {
    expect(buildResistSummaryRows([{ target: targetA, kind, hits }])).toEqual([
      { name: 'Ganger A', text: format(key, { hits }) },
    ]);
  });

  it('picks the plural form for the client language', () => {
    globalThis.game.i18n.lang = 'de';
    try {
      const [one, other] = buildResistSummaryRows([
        { target: targetA, kind: ResistOutcome.AFFECTED, hits: 1 },
        { target: targetB, kind: ResistOutcome.AFFECTED, hits: 3 },
      ]);

      expect(one.text).toBe(
        format('sr4.spell.resistSummary.affected.one', { hits: 1 })
      );
      expect(other.text).toBe(
        format('sr4.spell.resistSummary.affected.other', { hits: 3 })
      );
    } finally {
      delete globalThis.game.i18n.lang;
    }
  });

  it('keeps the order of the outcomes', () => {
    const rows = buildResistSummaryRows([
      { target: targetB, kind: ResistOutcome.RESISTED, hits: 0 },
      { target: targetA, kind: ResistOutcome.AFFECTED, hits: 1 },
    ]);

    expect(rows.map((row) => row.name)).toEqual(['Ganger B', 'Ganger A']);
  });

  it('returns no rows without outcomes', () => {
    expect(buildResistSummaryRows([])).toEqual([]);
  });

  it('shows an empty name for unnamed targets', () => {
    const [row] = buildResistSummaryRows([
      { target: {}, kind: ResistOutcome.RESISTED, hits: 0 },
    ]);

    expect(row.name).toBe('');
  });
});

describe('sendResistSummary', () => {
  const caster = { name: 'Caster' };
  const outcomes = [
    { target: targetA, kind: ResistOutcome.AFFECTED, hits: 2 },
    { target: targetB, kind: ResistOutcome.RESISTED, hits: 0 },
  ];

  it('posts one card spoken by the caster', async () => {
    await sendResistSummary(caster, 'Stunball', 'Force 4', outcomes);

    expect(renderTemplateMock).toHaveBeenCalledWith('resist-summary.hbs', {
      title: 'Stunball',
      details: 'Force 4',
      rows: buildResistSummaryRows(outcomes),
    });
    expect(getSpeakerMock).toHaveBeenCalledWith({ actor: caster });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      speaker: { alias: 'Caster' },
      content: '<div>summary</div>',
    });
  });

  it('posts nothing without outcomes', async () => {
    await sendResistSummary(caster, 'Stunball', 'Force 4', []);

    expect(renderTemplateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('resistOutcome', () => {
  it.each([
    [2, { kind: 'affected', hits: 2 }],
    [1, { kind: 'affected', hits: 1 }],
    [0, { kind: 'resisted', hits: 0 }],
    [-1, { kind: 'resisted', hits: 0 }],
  ])('%i net hits -> %o', (netHits, expected) => {
    expect(resistOutcome(targetA, netHits)).toEqual({
      target: targetA,
      ...expected,
    });
  });
});

describe('mergeCastOutcomes', () => {
  it('keeps the cast order and marks targets without casting hits', () => {
    const merged = mergeCastOutcomes(
      [
        { target: targetA, hits: 0 },
        { target: targetB, hits: 3 },
      ],
      [{ target: targetB, kind: ResistOutcome.AFFECTED, hits: 1 }]
    );

    expect(merged).toEqual([
      { target: targetA, kind: ResistOutcome.NO_HITS, hits: 0 },
      { target: targetB, kind: ResistOutcome.AFFECTED, hits: 1 },
    ]);
  });

  it('follows the cast order even when the outcomes are shuffled', () => {
    const merged = mergeCastOutcomes(
      [
        { target: targetA, hits: 2 },
        { target: targetB, hits: 3 },
      ],
      [
        { target: targetB, kind: ResistOutcome.RESISTED, hits: 0 },
        { target: targetA, kind: ResistOutcome.AFFECTED, hits: 2 },
      ]
    );

    expect(merged.map(({ target }) => target)).toEqual([targetA, targetB]);
  });

  it('uses the resist outcome for a target with a single casting hit', () => {
    const outcome = { target: targetA, kind: ResistOutcome.RESISTED, hits: 0 };

    expect(
      mergeCastOutcomes([{ target: targetA, hits: 1 }], [outcome])
    ).toEqual([outcome]);
  });

  it('drops hit targets that produced no outcome', () => {
    expect(mergeCastOutcomes([{ target: targetA, hits: 2 }], [])).toEqual([]);
  });
});
