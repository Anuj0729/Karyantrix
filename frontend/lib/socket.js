import { io } from "socket.io-client";

let socket = null;

export const getSocket = (token) => {
  if (socket) return socket;

  socket = io({
    auth: { token },
    path: "/socket.io",
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
