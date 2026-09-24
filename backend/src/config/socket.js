import { Server } from 'socket.io';
import { CLIENT_ORIGIN } from './env.js';

let io;

const allowedOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

function corsOriginCheck(origin, callback) {
  // No origin (native apps, server-to-server) — allow it.
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  // Dev convenience: allow any localhost/127.0.0.1 port, same as the main
  // Express CORS config — customer + admin frontends run on different ports.
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
  callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: corsOriginCheck, methods: ['GET', 'POST'], credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('join_tenant_room', (tenantId) => {
      if (!tenantId) return;
      socket.join(`tenant:${tenantId}`);
    });

    socket.on('disconnect', () => {
      // no-op — room membership is cleaned up automatically
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized — call initSocket(httpServer) first');
  }
  return io;
}
