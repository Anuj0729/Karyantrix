import { io } from 'socket.io-client';

let socket = null;

// const resolveApiBase = () => {
//   const envUrl = process.env.NEXT_PUBLIC_API_URL;

//   if (typeof window === 'undefined') {
//     return envUrl || 'http://localhost:5000/api';
//   }

//   const { hostname, protocol } = window.location;

//   if (envUrl) {
//     try {
//       if (new URL(envUrl).hostname === hostname) return envUrl;
//     } catch (_) {
//     }
//   }

//   const apiPort = process.env.NEXT_PUBLIC_API_PORT || '5000';
//   return `${protocol}//${hostname}:${apiPort}/api`;
// };


export const getSocket = (token) => {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_API_URL, {
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