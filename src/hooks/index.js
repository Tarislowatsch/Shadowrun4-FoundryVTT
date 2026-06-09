import { ActionClickHook } from './action-click-hook';
import { SR4CharacterCreationHook } from './character-creation.hooks';
import { DataModelRegistrationHook } from './datamodel-registration-hook';
import { DefenseHook } from './defense-request-hook';
import { DieChatHook } from './die-chat-hook';
import { InitiativeHook } from './initiative-hook';
import { SkillRollHook } from './skill-click-hook';

export function registerHooks() {
  new ActionClickHook();
  new DefenseHook();
  new SkillRollHook();
  new SR4CharacterCreationHook();
  new DataModelRegistrationHook();
  new InitiativeHook();
  new DieChatHook();
}
