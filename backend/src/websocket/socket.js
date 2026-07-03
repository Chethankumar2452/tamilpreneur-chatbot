// src/websocket/socket.js
const logger = require('../utils/logger');

let io = null;

function initSocket(socketIO) {
  io = socketIO;

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Admin dashboard joins admin room
    socket.on('join_admin', (token) => {
      // Simple token check — in production verify JWT
      if (token) {
        socket.join('admins');
        logger.info(`Admin joined: ${socket.id}`);
      }
    });

    // Chat session room
    socket.on('join_session', (sessionId) => {
      socket.join(`session:${sessionId}`);
      logger.info(`Joined session: ${sessionId}`);
    });

    socket.on('leave_session', (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
