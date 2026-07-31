import { getGame } from './game.js';

const SYSTEM_SOCKET_EVENT = 'system.shadowrun4e';

const CLIENT_ORIGIN = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * @typedef {{ action: string, payload?: object, _originId?: string }} SystemSocketMessage
 */

/** @type {Set<(data: SystemSocketMessage) => unknown>} */
const localHandlers = new Set();

/** @type {Map<(data: SystemSocketMessage) => unknown, (data: SystemSocketMessage) => unknown>} */
const socketListeners = new Map();

/**
 * @returns {any}
 */
function getSocket() {
  return getGame().socket;
}

/**
 * Wraps a handler so a message this client sent is only ever handled once, even
 * if the socket delivers it back to the sender.
 * @param {(data: SystemSocketMessage) => unknown} handler
 * @returns {(data: SystemSocketMessage) => unknown}
 */
function socketListenerFor(handler) {
  let listener = socketListeners.get(handler);
  if (!listener) {
    listener = (data) => {
      if (data?._originId === CLIENT_ORIGIN) return undefined;
      return handler(data);
    };
    socketListeners.set(handler, listener);
  }
  return listener;
}

/**
 * @param {(data: SystemSocketMessage) => unknown} handler
 * @returns {void}
 */
export function onSystemSocket(handler) {
  localHandlers.add(handler);
  const listener = socketListenerFor(handler);
  const socket = getSocket();
  socket?.off(SYSTEM_SOCKET_EVENT, listener);
  socket?.on(SYSTEM_SOCKET_EVENT, listener);
}

/**
 * @param {(data: SystemSocketMessage) => unknown} handler
 * @returns {void}
 */
export function offSystemSocket(handler) {
  localHandlers.delete(handler);
  const listener = socketListeners.get(handler);
  if (!listener) return;
  socketListeners.delete(handler);
  getSocket()?.off(SYSTEM_SOCKET_EVENT, listener);
}

/**
 * @param {SystemSocketMessage} data
 * @returns {Promise<void>}
 */
export async function emitSystemSocket(data) {
  const message = { ...data, _originId: CLIENT_ORIGIN };
  getSocket()?.emit(SYSTEM_SOCKET_EVENT, message);
  await Promise.all(
    [...localHandlers].map(async (handler) => {
      try {
        await handler(message);
      } catch (error) {
        console.error(
          `SR4 | local socket handler failed for ${message.action}`,
          error
        );
      }
    })
  );
}
