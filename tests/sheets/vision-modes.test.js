import { describe, it, expect, vi, beforeEach } from 'vitest';

const promptSelectDialogMock = vi.fn();
vi.mock('@utils/dialog', () => ({
  promptSelectDialog: (...args) => promptSelectDialogMock(...args),
}));

const {
  buildVisionModesContext,
  onAddVisionMode,
  onRemoveVisionMode,
  onToggleVisionMode,
} = await import('@sheets/shared/vision-modes.js');

/**
 * @param {{ vision?: Record<string, boolean>, visionDisabled?: Record<string, boolean>, powers?: string[] }} [options]
 * @returns {any}
 */
function makeActor({ vision = {}, visionDisabled = {}, powers } = {}) {
  return {
    _source: { system: { vision, visionDisabled } },
    items: powers ? [{ type: 'Metatype', system: { powers } }] : [],
    update: vi.fn(),
  };
}

/**
 * @param {string} visionMode
 * @returns {any}
 */
function target(visionMode) {
  return { dataset: { visionMode } };
}

beforeEach(() => {
  promptSelectDialogMock.mockReset();
  globalThis.game = { i18n: { localize: (key) => key } };
});

describe('buildVisionModesContext', () => {
  it('lists nothing and offers every mode for normal vision', () => {
    const context = buildVisionModesContext(makeActor());
    expect(context.rows).toEqual([]);
    expect(context.available).toEqual([
      'lowLight',
      'thermographic',
      'ultrasound',
      'flareCompensation',
    ]);
    expect(context.complete).toBe(false);
  });

  it('marks metatype modes as not removable', () => {
    const context = buildVisionModesContext(
      makeActor({ powers: ['Thermographic Vision'] })
    );
    expect(context.rows).toEqual([
      {
        mode: 'thermographic',
        label: 'sr4.visibility.vision.thermographic',
        fromMetatype: true,
        removable: false,
        active: true,
      },
    ]);
    expect(context.available).not.toContain('thermographic');
  });

  it('lists manually added modes as removable', () => {
    const context = buildVisionModesContext(
      makeActor({ vision: { lowLight: true, ultrasound: false } })
    );
    expect(context.rows.map((row) => [row.mode, row.removable])).toEqual([
      ['lowLight', true],
    ]);
  });

  it('keeps deactivated modes listed as inactive', () => {
    const context = buildVisionModesContext(
      makeActor({
        powers: ['Low-Light Vision'],
        visionDisabled: { lowLight: true },
      })
    );
    expect(context.rows.map((row) => [row.mode, row.active])).toEqual([
      ['lowLight', false],
    ]);
    expect(context.available).not.toContain('lowLight');
  });

  it('is complete once every mode is present', () => {
    const context = buildVisionModesContext(
      makeActor({
        vision: { ultrasound: true, flareCompensation: true },
        powers: ['Low-Light Vision', 'Thermographic Vision'],
      })
    );
    expect(context.complete).toBe(true);
  });
});

describe('onAddVisionMode', () => {
  it('offers only missing modes and stores the selection as active', async () => {
    const actor = makeActor({ powers: ['Low-Light Vision'] });
    promptSelectDialogMock.mockResolvedValue('thermographic');

    await onAddVisionMode.call({ actor });

    const values = promptSelectDialogMock.mock.calls[0][0].options.map(
      (option) => option.value
    );
    expect(values).not.toContain('lowLight');
    expect(values).toContain('thermographic');
    expect(actor.update).toHaveBeenCalledWith({
      'system.vision.thermographic': true,
      'system.visionDisabled.thermographic': false,
    });
  });

  it('does nothing when the dialog is cancelled', async () => {
    const actor = makeActor();
    promptSelectDialogMock.mockResolvedValue(null);

    await onAddVisionMode.call({ actor });

    expect(actor.update).not.toHaveBeenCalled();
  });
});

describe('onRemoveVisionMode', () => {
  it('clears the manual vision mode and its deactivation', async () => {
    const actor = makeActor({ vision: { ultrasound: true } });

    await onRemoveVisionMode.call(
      { actor },
      new Event('click'),
      target('ultrasound')
    );

    expect(actor.update).toHaveBeenCalledWith({
      'system.vision.ultrasound': false,
      'system.visionDisabled.ultrasound': false,
    });
  });

  it('ignores unknown modes', async () => {
    const actor = makeActor();

    await onRemoveVisionMode.call(
      { actor },
      new Event('click'),
      target('xray')
    );

    expect(actor.update).not.toHaveBeenCalled();
  });
});

describe('onToggleVisionMode', () => {
  it('deactivates an active metatype mode', async () => {
    const actor = makeActor({ powers: ['Low-Light Vision'] });

    await onToggleVisionMode.call(
      { actor },
      new Event('click'),
      target('lowLight')
    );

    expect(actor.update).toHaveBeenCalledWith({
      'system.visionDisabled.lowLight': true,
    });
  });

  it('reactivates a deactivated mode', async () => {
    const actor = makeActor({
      vision: { thermographic: true },
      visionDisabled: { thermographic: true },
    });

    await onToggleVisionMode.call(
      { actor },
      new Event('click'),
      target('thermographic')
    );

    expect(actor.update).toHaveBeenCalledWith({
      'system.visionDisabled.thermographic': false,
    });
  });
});
