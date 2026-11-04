import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyKnockdownMock = vi.fn();

vi.mock('@models/shared/knockdown-rules.js', async (importOriginal) => ({
  ...(await importOriginal()),
  applyKnockdown: (...args) => applyKnockdownMock(...args),
}));

const { ApplyDamageFlow, getDamageDecisionEntry } = await import(
  '../src/domains/combat/flow/apply-damage-flow.js'
);

function makeActor() {
  return {
    id: 'actor1',
    name: 'Runner',
    type: 'character',
    system: {
      conditionMonitor: {
        physical: { value: 0, max: 10 },
        stun: { value: 0, max: 10 },
      },
      derivedStats: { overflow: 3 },
    },
    update: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.game.settings = { get: vi.fn().mockReturnValue(true) };
  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue({ id: 'msg1' }),
    getSpeaker: vi.fn().mockReturnValue({}),
  };
});

describe('ApplyDamageFlow.applyAndSend — knockdown', () => {
  it('forwards the attack context alongside the damage', async () => {
    const actor = makeActor();
    const attack = { gelRounds: true };

    await ApplyDamageFlow.applyAndSend(4, true, actor, 'combat', { attack });

    expect(applyKnockdownMock).toHaveBeenCalledWith(actor, 4, attack);
  });

  it('checks the DV it was handed, not what fit into the monitor', async () => {
    const actor = makeActor();
    actor.system.conditionMonitor.physical.value = 9;

    await ApplyDamageFlow.applyAndSend(6, true, actor, 'combat');

    const written = actor.update.mock.calls[0][0]['system.conditionMonitor'];
    expect(written.physical.value).toBe(13);
    expect(applyKnockdownMock).toHaveBeenCalledWith(actor, 6, undefined);
  });

  it('checks combat spells as attacks', async () => {
    const actor = makeActor();

    await ApplyDamageFlow.applyAndSend(6, false, actor, 'spell');

    expect(applyKnockdownMock).toHaveBeenCalledWith(actor, 6, undefined);
  });

  it.each(['drain', 'dumpshock', 'blackIc', 'cybercombat'])(
    'skips the knockdown check for non-attack damage (%s)',
    async (context) => {
      await ApplyDamageFlow.applyAndSend(6, false, makeActor(), context);

      expect(applyKnockdownMock).not.toHaveBeenCalled();
    }
  );

  it('still runs onApply when the knockdown check throws', async () => {
    applyKnockdownMock.mockRejectedValue(new Error('no permission'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onApply = vi.fn();

    await ApplyDamageFlow.applyAndSend(4, true, makeActor(), 'combat', {
      onApply,
    });

    expect(onApply).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('still runs onApply after the knockdown check', async () => {
    const order = [];
    applyKnockdownMock.mockImplementation(async () => order.push('knockdown'));
    const onApply = vi.fn(async () => order.push('onApply'));

    await ApplyDamageFlow.applyAndSend(4, true, makeActor(), 'combat', {
      onApply,
    });

    expect(order).toEqual(['knockdown', 'onApply']);
  });

  it('also runs for fully resisted damage so the rule module decides', async () => {
    const actor = makeActor();

    await ApplyDamageFlow.applyAndSend(0, true, actor, 'combat');

    expect(applyKnockdownMock).toHaveBeenCalledWith(actor, 0, undefined);
  });

  it('parks the attack context in the registry for the decision card', async () => {
    const attack = { gelRounds: true };

    const messageId = await ApplyDamageFlow.sendDecisionMessage(
      makeActor(),
      4,
      true,
      'combat',
      { attack }
    );

    expect(applyKnockdownMock).not.toHaveBeenCalled();
    expect(getDamageDecisionEntry(messageId)?.attack).toBe(attack);
  });

  it('skips the registry and checks knockdown when the workflow is off', async () => {
    globalThis.game.settings.get.mockReturnValue(false);
    const attack = { gelRounds: true };

    await ApplyDamageFlow.sendDecisionMessage(makeActor(), 4, true, 'combat', {
      attack,
    });

    expect(applyKnockdownMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'actor1' }),
      4,
      attack
    );
  });
});
