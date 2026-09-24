import { io } from 'socket.io-client';

let socket;

export function connectSocket(tenantId) {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
  }
  socket.on('connect', () => {
    socket.emit('join_tenant_room', tenantId);
  });
  return socket;
}

export function getSocket() {
  return socket;
}
