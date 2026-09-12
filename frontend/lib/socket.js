import { io } from 'socket.io-client';

let socket = null;

const resolveSocketUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:5000';
  }

  const { hostname, protocol } = window.location;

  if (envUrl) {
    try {
      if (new URL(envUrl).hostname === hostname) return envUrl;
    } catch (_) {
    }
  }

  const socketPort = process.env.NEXT_API_PORT || '5000';
  return `${protocol}//${hostname}:${socketPort}`;
};

export const getSocket = (token) => {
  if (socket) return socket;

  socket = io(resolveSocketUrl(), {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};