import { describe, it, expect, vi, beforeEach } from 'vitest';

const requestReactiveDecisionMock = vi.fn();
const getMatrixPersonaMock = vi.fn();
const computeBiofeedbackDamageMock = vi.fn();
const openMatrixDefenseDialogMock = vi.fn();
const openMatrixResistDialogMock = vi.fn();
const defaultMatrixDefenseHitsMock = vi.fn();
const defaultMatrixResistHitsMock = vi.fn();
const sendDecisionMessageMock = vi.fn();
const applyDamageSendDecisionMessageMock = vi.fn();

vi.mock('@utils/rolls/decision-provider.js', () => ({
  requestReactiveDecision: (...args) => requestReactiveDecisionMock(...args),
  DecisionCategory: { MATRIX: 'matrix' },
  DecisionKind: {
    MATRIX_DEFENSE: 'matrixDefense',
    MATRIX_RESIST: 'matrixResist',
    BIOFEEDBACK_RESIST: 'biofeedbackResist',
  },
  DecisionRouting: { OWNER: 'owner' },
}));

vi.mock('../src/domains/matrix/matrix-persona.js', () => ({
  getMatrixPersona: (...args) => getMatrixPersonaMock(...args),
}));

vi.mock('../src/domains/matrix/matrix-rules.js', () => ({
  computeBiofeedbackDamage: (...args) => computeBiofeedbackDamageMock(...args),
}));

vi.mock('../src/domains/matrix/dialogs/cybercombat.js', () => ({
  openMatrixDefenseDialog: (...args) => openMatrixDefenseDialogMock(...args),
  openMatrixResistDialog: (...args) => openMatrixResistDialogMock(...args),
  defaultMatrixDefenseHits: (...args) => defaultMatrixDefenseHitsMock(...args),
  defaultMatrixResistHits: (...args) => defaultMatrixResistHitsMock(...args),
}));

vi.mock('../src/domains/matrix/flow/matrix-damage-flow.js', () => ({
  MatrixDamageFlow: {
    sendDecisionMessage: (...args) => sendDecisionMessageMock(...args),
  },
}));

vi.mock('../src/domains/combat/flow/apply-damage-flow.js', () => ({
  ApplyDamageFlow: {
    sendDecisionMessage: (...args) =>
      applyDamageSendDecisionMessageMock(...args),
  },
}));

const { MatrixDefenseFlow } = await import(
  '../src/domains/matrix/flow/defense-flow.js'
);

function makeDefender({ uuid = 'Actor.defender1', name = 'Defender' } = {}) {
  return {
    uuid,
    name,
    system: { conditionMonitor: { stun: { value: 0, max: 10 } } },
    update: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.game.socket = { emit: vi.fn() };
  globalThis.ChatMessage = { create: vi.fn() };
});

describe('MatrixDefenseFlow.handleJam', () => {
  it('does nothing when the defender is not in VR', async () => {
    getMatrixPersonaMock.mockReturnValue({ inVR: false });
    const defender = makeDefender();

    await MatrixDefenseFlow.handleJam(defender, { attackerUuid: 'Actor.ic' });

    expect(defender.update).not.toHaveBeenCalled();
    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
  });

  it('jams the defender and posts a chat message when in VR', async () => {
    getMatrixPersonaMock.mockReturnValue({ inVR: true });
    const defender = makeDefender();

    await MatrixDefenseFlow.handleJam(defender, { attackerUuid: 'Actor.ic' });

    expect(defender.update).toHaveBeenCalledWith({
      'system.matrix.jammedBy': 'Actor.ic',
    });
    expect(globalThis.ChatMessage.create).toHaveBeenCalledOnce();
  });
});

describe('MatrixDefenseFlow.handleBiofeedbackResist', () => {
  it('posts a no-effect message and skips resolution when not in VR', async () => {
    getMatrixPersonaMock.mockReturnValue({ inVR: false });
    const defender = makeDefender();

    await MatrixDefenseFlow.handleBiofeedbackResist(defender, {
      dv: 8,
      programCategory: 'blackout',
    });

    expect(requestReactiveDecisionMock).not.toHaveBeenCalled();
    expect(globalThis.ChatMessage.create).toHaveBeenCalledOnce();
  });

  it('applies damage via ApplyDamageFlow when the computed amount is positive', async () => {
    getMatrixPersonaMock.mockReturnValue({ inVR: true, simMode: 'cold' });
    requestReactiveDecisionMock.mockResolvedValue(1);
    computeBiofeedbackDamageMock.mockReturnValue({
      amount: 3,
      isPhysical: false,
    });
    const defender = makeDefender();

    await MatrixDefenseFlow.handleBiofeedbackResist(defender, {
      dv: 8,
      programCategory: 'blackout',
    });

    expect(applyDamageSendDecisionMessageMock).toHaveBeenCalledWith(
      defender,
      3,
      false,
      'blackIc'
    );
  });

  it('does not send a damage message when the computed amount is 0', async () => {
    getMatrixPersonaMock.mockReturnValue({ inVR: true, simMode: 'cold' });
    requestReactiveDecisionMock.mockResolvedValue(5);
    computeBiofeedbackDamageMock.mockReturnValue({
      amount: 0,
      isPhysical: false,
    });
    const defender = makeDefender();

    await MatrixDefenseFlow.handleBiofeedbackResist(defender, {
      dv: 8,
      programCategory: 'blackout',
    });

    expect(applyDamageSendDecisionMessageMock).not.toHaveBeenCalled();
  });
});

describe('MatrixDefenseFlow.handleMatrixResist', () => {
  it('forwards the unresisted damage to MatrixDamageFlow', async () => {
    requestReactiveDecisionMock.mockResolvedValue(2);
    const defender = makeDefender();

    await MatrixDefenseFlow.handleMatrixResist(defender, {
      dv: 6,
      programName: 'Black Hammer',
    });

    expect(sendDecisionMessageMock).toHaveBeenCalledWith(
      defender,
      4,
      'cybercombat'
    );
  });

  it('clamps unresisted damage at 0 when resist hits exceed the DV', async () => {
    requestReactiveDecisionMock.mockResolvedValue(9);
    const defender = makeDefender();

    await MatrixDefenseFlow.handleMatrixResist(defender, {
      dv: 6,
      programName: 'Black Hammer',
    });

    expect(sendDecisionMessageMock).toHaveBeenCalledWith(
      defender,
      0,
      'cybercombat'
    );
  });
});

describe('MatrixDefenseFlow.handleDefense', () => {
  it('emits matrixDefenseRolled with the resolved defense hits', async () => {
    globalThis.fromUuid = vi.fn().mockResolvedValue({ name: 'Attacker' });
    requestReactiveDecisionMock.mockResolvedValue(3);
    const defender = makeDefender();

    await MatrixDefenseFlow.handleDefense(defender, {
      attackerUuid: 'Actor.attacker1',
      programName: 'Black Hammer',
      attackHits: 5,
    });

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      {
        action: 'matrixDefenseRolled',
        payload: {
          attackerUuid: 'Actor.attacker1',
          defenderUuid: defender.uuid,
          defenseHits: 3,
        },
      }
    );
  });
});
