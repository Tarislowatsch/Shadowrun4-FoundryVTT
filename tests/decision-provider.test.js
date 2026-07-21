import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const rollAndShowMock = vi.fn();

vi.mock('@utils/rolls/diceutility.js', () => ({
  DiceUtility: { rollAndShow: (...args) => rollAndShowMock(...args) },
}));

const {
  resolveDecisionMode,
  requestReactiveDecision,
  resolvePendingDialog,
  getPendingDialogEntry,
  DecisionCategory,
  DecisionKind,
  DecisionRouting,
} = await import('@utils/rolls/decision-provider.js');

/** Applies Foundry-style flattened (dot-notation) update data to a plain object. */
function applyUpdate(target, data) {
  for (const [path, value] of Object.entries(data)) {
    const keys = path.split('.');
    let obj = target;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] ??= {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }
}

/** @type {Record<string, unknown>} */
let settings;
let createdMessage;

function makeActor() {
  return { id: 'actor-1', name: 'Runner' };
}

beforeEach(() => {
  vi.clearAllMocks();
  settings = {
    decisionMode: 'dialog',
    decisionModeCombat: 'dialog',
    decisionModeMagic: 'dialog',
    decisionModeMatrix: 'dialog',
    flowOpposedRollTimeout: 30,
  };
  globalThis.game.settings = { get: (_ns, key) => settings[key] };

  createdMessage = null;
  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
    create: vi.fn(async (data) => {
      createdMessage = { id: 'pending-1', flags: data.flags, isAuthor: true };
      createdMessage.update = vi.fn(async (patch) =>
        applyUpdate(createdMessage, patch)
      );
      return createdMessage;
    }),
  };
  globalThis.game.messages = {
    get: (id) => (createdMessage?.id === id ? createdMessage : undefined),
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('resolveDecisionMode', () => {
  it('returns the global mode when not custom', () => {
    settings.decisionMode = 'dialog';
    expect(resolveDecisionMode(DecisionCategory.COMBAT)).toBe('dialog');
    settings.decisionMode = 'chat';
    expect(resolveDecisionMode(DecisionCategory.MAGIC)).toBe('chat');
  });

  it('maps custom to the per-category setting', () => {
    settings.decisionMode = 'custom';
    settings.decisionModeCombat = 'chat';
    settings.decisionModeMagic = 'dialog';
    settings.decisionModeMatrix = 'chat';
    expect(resolveDecisionMode(DecisionCategory.COMBAT)).toBe('chat');
    expect(resolveDecisionMode(DecisionCategory.MAGIC)).toBe('dialog');
    expect(resolveDecisionMode(DecisionCategory.MATRIX)).toBe('chat');
  });

  it('falls back to dialog when a setting is missing', () => {
    settings.decisionMode = undefined;
    expect(resolveDecisionMode(DecisionCategory.COMBAT)).toBe('dialog');
  });
});

describe('requestReactiveDecision — dialog passthrough', () => {
  it('opens the dialog directly in dialog mode', async () => {
    settings.decisionMode = 'dialog';
    const openDialog = vi.fn(async () => ({ successes: 2 }));
    const result = await requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      standardPool: 5,
      openDialog,
    });
    expect(openDialog).toHaveBeenCalledOnce();
    expect(result).toEqual({ successes: 2 });
    expect(ChatMessage.create).not.toHaveBeenCalled();
  });

  it('opens the dialog when chat is unsupported even in chat mode', async () => {
    settings.decisionMode = 'chat';
    const openDialog = vi.fn(async () => ({ successes: 1 }));
    await requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: false,
      standardPool: 5,
      openDialog,
    });
    expect(openDialog).toHaveBeenCalledOnce();
    expect(ChatMessage.create).not.toHaveBeenCalled();
  });

  it('opens the dialog for GM routing (no owner actor)', async () => {
    settings.decisionMode = 'chat';
    const openDialog = vi.fn(async () => ({ successes: 0 }));
    await requestReactiveDecision({
      category: DecisionCategory.MAGIC,
      dialogKind: DecisionKind.SPIRIT_RESIST,
      routing: DecisionRouting.GM,
      chatModeSupported: true,
      standardPool: 4,
      openDialog,
    });
    expect(openDialog).toHaveBeenCalledOnce();
    expect(ChatMessage.create).not.toHaveBeenCalled();
  });
});

describe('requestReactiveDecision — chat mode', () => {
  it('posts a pending card and resolves via the dialog on click', async () => {
    settings.decisionMode = 'chat';
    const dialogResult = {
      successes: 3,
      isGlitch: false,
      rolledDice: 6,
      edgeUsed: false,
      messageId: 'm1',
    };
    const openDialog = vi.fn(async () => dialogResult);

    const promise = requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      standardPool: 5,
      openDialog,
    });

    await Promise.resolve();
    expect(ChatMessage.create).toHaveBeenCalledOnce();
    expect(getPendingDialogEntry('pending-1')).toBeDefined();
    expect(createdMessage.flags.sr4.pendingDialog.actorId).toBe('actor-1');

    await resolvePendingDialog('pending-1');

    await expect(promise).resolves.toEqual(dialogResult);
    expect(openDialog).toHaveBeenCalledOnce();
    expect(rollAndShowMock).not.toHaveBeenCalled();
    expect(createdMessage.flags.sr4.pendingDialog.resolved).toBe(true);
    expect(getPendingDialogEntry('pending-1')).toBeUndefined();
  });

  it('auto-rolls the default pool on timeout', async () => {
    vi.useFakeTimers();
    settings.decisionMode = 'chat';
    settings.flowOpposedRollTimeout = 30;
    rollAndShowMock.mockResolvedValue({
      successes: 1,
      isGlitch: false,
      messageId: 'auto-1',
    });
    const openDialog = vi.fn(async () => ({ successes: 9 }));

    const promise = requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      standardPool: 7,
      openDialog,
    });

    await vi.advanceTimersByTimeAsync(30 * 1000);

    const result = await promise;
    expect(openDialog).not.toHaveBeenCalled();
    expect(rollAndShowMock).toHaveBeenCalledOnce();
    expect(rollAndShowMock.mock.calls[0][0]).toMatchObject({ numDice: 7 });
    expect(result).toMatchObject({
      successes: 1,
      rolledDice: 7,
      edgeUsed: false,
    });
    expect(createdMessage.flags.sr4.pendingDialog.resolved).toBe(true);
    expect(getPendingDialogEntry('pending-1')).toBeUndefined();
  });
});

describe('requestReactiveDecision — number-shaped defaultResult override', () => {
  it('gates chat on defaultResult when standardPool is absent', async () => {
    settings.decisionMode = 'chat';
    const openDialog = vi.fn(async () => 4);
    const promise = requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.MATRIX,
      dialogKind: DecisionKind.DUMPSHOCK,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      defaultResult: async () => 2,
      openDialog,
    });

    await Promise.resolve();
    expect(ChatMessage.create).toHaveBeenCalledOnce();

    await resolvePendingDialog('pending-1');

    await expect(promise).resolves.toBe(4);
    expect(openDialog).toHaveBeenCalledOnce();
  });

  it('auto-resolves with the number default on timeout', async () => {
    vi.useFakeTimers();
    settings.decisionMode = 'chat';
    const defaultResult = vi.fn(async () => 2);
    const openDialog = vi.fn(async () => 4);
    const promise = requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.MATRIX,
      dialogKind: DecisionKind.DUMPSHOCK,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      defaultResult,
      openDialog,
    });

    await vi.advanceTimersByTimeAsync(30 * 1000);

    await expect(promise).resolves.toBe(2);
    expect(openDialog).not.toHaveBeenCalled();
    expect(defaultResult).toHaveBeenCalledOnce();
  });
});

describe('requestReactiveDecision — idempotency under races', () => {
  const flush = () => vi.advanceTimersByTimeAsync(0);

  function startChatDecision(openDialog, standardPool = 5) {
    settings.decisionMode = 'chat';
    return requestReactiveDecision({
      actor: makeActor(),
      category: DecisionCategory.COMBAT,
      dialogKind: DecisionKind.DEFENSE,
      routing: DecisionRouting.OWNER,
      chatModeSupported: true,
      standardPool,
      openDialog,
    });
  }

  it('a second click is a no-op — the dialog opens exactly once', async () => {
    const dialogResult = { successes: 3, isGlitch: false };
    const openDialog = vi.fn(async () => dialogResult);
    const promise = startChatDecision(openDialog);
    await Promise.resolve();

    await resolvePendingDialog('pending-1');
    await resolvePendingDialog('pending-1');

    await expect(promise).resolves.toEqual(dialogResult);
    expect(openDialog).toHaveBeenCalledOnce();
    expect(getPendingDialogEntry('pending-1')).toBeUndefined();
  });

  it('a timeout firing after a click neither re-resolves nor auto-rolls', async () => {
    vi.useFakeTimers();
    const dialogResult = { successes: 3, isGlitch: false };
    const openDialog = vi.fn(async () => dialogResult);
    const promise = startChatDecision(openDialog);
    await flush();

    await resolvePendingDialog('pending-1');
    await expect(promise).resolves.toEqual(dialogResult);

    await vi.advanceTimersByTimeAsync(30 * 1000);

    expect(rollAndShowMock).not.toHaveBeenCalled();
    expect(openDialog).toHaveBeenCalledOnce();
  });

  it('a stale click after a timeout does not open the dialog', async () => {
    vi.useFakeTimers();
    rollAndShowMock.mockResolvedValue({
      successes: 1,
      isGlitch: false,
      messageId: 'auto-1',
    });
    const openDialog = vi.fn(async () => ({ successes: 9 }));
    const promise = startChatDecision(openDialog, 7);
    await flush();

    await vi.advanceTimersByTimeAsync(30 * 1000);
    await promise;

    await resolvePendingDialog('pending-1');

    expect(openDialog).not.toHaveBeenCalled();
    expect(rollAndShowMock).toHaveBeenCalledOnce();
  });
});
