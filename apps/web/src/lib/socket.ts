import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Socket Registry
// ---------------------------------------------------------------------------

/**
 * Internal map of namespace -> Socket instance.
 *
 * Connections are created lazily via `getSocket()` and cached so that
 * subsequent calls for the same namespace return the same instance.
 */
const sockets = new Map<string, Socket>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve (or create) a Socket.IO connection for the given namespace.
 *
 * The socket is created with `autoConnect: false` so the caller must
 * explicitly call `socket.connect()` when ready. This avoids premature
 * connections before the component is fully mounted.
 *
 * @example
 * ```ts
 * const socket = getSocket('/notifications');
 * socket.connect();
 * socket.on('new-notification', (data) => { ... });
 * ```
 */
export function getSocket(namespace: string): Socket {
  const key = namespace;

  if (sockets.has(key)) {
    return sockets.get(key)!;
  }

  const socket = io(`${SOCKET_URL}${namespace}`, {
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  sockets.set(key, socket);
  return socket;
}

/**
 * Disconnect and remove all cached socket connections.
 *
 * Call this on logout to ensure no stale connections remain.
 */
export function disconnectAll(): void {
  sockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.disconnect();
  });
  sockets.clear();
}

/**
 * Disconnect and remove the socket for a specific namespace.
 */
export function disconnectSocket(namespace: string): void {
  const socket = sockets.get(namespace);

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    sockets.delete(namespace);
  }
}
