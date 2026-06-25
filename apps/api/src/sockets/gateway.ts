import { Server as HttpServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';

export const initializeSocketServer = (server: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

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

  return io;
};
