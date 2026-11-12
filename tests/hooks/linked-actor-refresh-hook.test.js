import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedActorRefreshHook } from '../../src/hooks/linked-actor-refresh-hook.js';

/** @type {Map<string, Function>} */
let handlers;
/** @type {Record<string, { sheet: { rendered: boolean, render: Function } }>} */
let owners;

function makeOwner(uuid, rendered = true) {
  owners[uuid] = { sheet: { rendered, render: vi.fn() } };
  return owners[uuid];
}

beforeEach(() => {
  handlers = new Map();
  owners = {};
  globalThis.Hooks = {
    on: (event, handler) => handlers.set(event, handler),
  };
  globalThis.fromUuidSync = vi.fn((uuid) => owners[uuid] ?? null);
  new LinkedActorRefreshHook();
});

function spirit(system) {
  return { type: 'spirit', system };
}

describe('LinkedActorRefreshHook', () => {
  it('redraws the previous and the new owner when a spirit changes hands', () => {
    const previous = makeOwner('Actor.old');
    const next = makeOwner('Actor.new');
    const actor = spirit({ ownerUuid: 'Actor.old' });
    const changes = { system: { ownerUuid: 'Actor.new' } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    actor.system.ownerUuid = 'Actor.new';
    handlers.get('updateActor')(actor, changes, options);

    expect(previous.sheet.render).toHaveBeenCalledOnce();
    expect(next.sheet.render).toHaveBeenCalledOnce();
  });

  it('redraws the owner when a spirit is unlinked', () => {
    const owner = makeOwner('Actor.owner1');
    const actor = spirit({ ownerUuid: 'Actor.owner1', bound: true });
    const changes = { system: { ownerUuid: '', bound: false } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    actor.system = { ownerUuid: '', bound: false };
    handlers.get('updateActor')(actor, changes, options);

    expect(owner.sheet.render).toHaveBeenCalledOnce();
  });

  it('redraws the owner when only the bound state changes', () => {
    const owner = makeOwner('Actor.owner1');
    const actor = spirit({ ownerUuid: 'Actor.owner1', bound: true });
    const changes = { system: { bound: true } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    handlers.get('updateActor')(actor, changes, options);

    expect(owner.sheet.render).toHaveBeenCalledOnce();
  });

  it('redraws the rigger when a vehicle is unlinked', () => {
    const rigger = makeOwner('Actor.rigger1');
    const actor = { type: 'vehicle', system: { riggerUuid: 'Actor.rigger1' } };
    const changes = { system: { riggerUuid: '' } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    actor.system.riggerUuid = '';
    handlers.get('updateActor')(actor, changes, options);

    expect(rigger.sheet.render).toHaveBeenCalledOnce();
  });

  it('ignores updates that do not touch the link', () => {
    const owner = makeOwner('Actor.owner1');
    const actor = spirit({ ownerUuid: 'Actor.owner1' });
    const changes = { system: { services: 2 } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    handlers.get('updateActor')(actor, changes, options);

    expect(owner.sheet.render).not.toHaveBeenCalled();
  });

  it('ignores actor types that cannot be linked', () => {
    const owner = makeOwner('Actor.owner1');
    const actor = {
      type: 'character',
      system: { ownerUuid: 'Actor.owner1' },
    };
    const changes = { system: { ownerUuid: '' } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    handlers.get('updateActor')(actor, changes, options);

    expect(owner.sheet.render).not.toHaveBeenCalled();
  });

  it('leaves closed owner sheets closed', () => {
    const owner = makeOwner('Actor.owner1', false);
    const actor = spirit({ ownerUuid: 'Actor.owner1' });
    const changes = { system: { ownerUuid: '' } };
    const options = {};

    handlers.get('preUpdateActor')(actor, changes, options);
    handlers.get('updateActor')(actor, changes, options);

    expect(owner.sheet.render).not.toHaveBeenCalled();
  });

  it.each(['createActor', 'deleteActor'])(
    'redraws the owner on %s of a linked spirit',
    (event) => {
      const owner = makeOwner('Actor.owner1');

      handlers.get(event)(spirit({ ownerUuid: 'Actor.owner1' }));

      expect(owner.sheet.render).toHaveBeenCalledOnce();
    }
  );
});
