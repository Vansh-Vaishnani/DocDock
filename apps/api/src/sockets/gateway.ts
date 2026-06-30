import { Server as HttpServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';
import { ChatRepository } from '../modules/chat/chat.repository';

const chatRepository = new ChatRepository();

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
    socket.on('join', (payload: { roomId: string; userId: string }) => {
      if (payload.roomId) {
        socket.join(payload.roomId);
        console.log(`Socket joined chat room: ${payload.roomId} (User: ${payload.userId})`);
        socket.to(payload.roomId).emit('user:online', { userId: payload.userId });
      }
    });

    socket.on('message:send', (payload: { roomId: string; message: any }) => {
      if (payload.roomId) {
        io.of('/chat').to(payload.roomId).emit('message:receive', payload.message);
      }
    });

    socket.on('typing:start', (payload: { roomId: string; userId: string }) => {
      if (payload.roomId) {
        socket.to(payload.roomId).emit('typing:start', { userId: payload.userId });
      }
    });

    socket.on('typing:stop', (payload: { roomId: string; userId: string }) => {
      if (payload.roomId) {
        socket.to(payload.roomId).emit('typing:stop', { userId: payload.userId });
      }
    });

    socket.on('message:read', async (payload: { roomId: string; userId: string }) => {
      if (payload.roomId && payload.userId) {
        try {
          await chatRepository.markRead(payload.roomId, payload.userId);
          socket.to(payload.roomId).emit('message:read', { roomId: payload.roomId, readerId: payload.userId });
        } catch (err) {
          console.error('[Socket Chat] Failed to mark messages read:', err);
        }
      }
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
