import { Server as HttpServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.io server not initialized');
  }
  return ioInstance;
};

export const initializeSocketServer = (server: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance = io;

  io.of('/tracking').on('connection', (socket) => {
    socket.on('doctor:location_update', (payload) => {
      socket.broadcast.emit('doctor:location_update', payload);
    });
    socket.on('heartbeat', (payload) => {
      socket.emit('heartbeat', payload);
    });
  });

  io.of('/chat').on('connection', (socket) => {
    socket.on('chat:send_message', (payload) => {
      socket.broadcast.emit('chat:message', payload);
    });
  });

  io.of('/availability').on('connection', (socket) => {
    socket.on('availability:update', (payload) => {
      socket.broadcast.emit('availability:update', payload);
    });
  });

  io.of('/notifications').on('connection', (socket) => {
    socket.on('join', (userId: string) => {
      if (userId) {
        socket.join(userId);
        console.log(`Socket joined notification room: ${userId}`);
      }
    });
  });

  return io;
};
