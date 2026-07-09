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

        try {
          const parts = payload.roomId.split(':');
          if (parts.length >= 3) {
            const [appointmentId, patientId, doctorId] = parts;
            const recipientId = payload.message.senderRole === 'patient' ? doctorId : patientId;
            io.of('/notifications').to(recipientId).emit('chat:message_received', {
              roomId: payload.roomId,
              appointmentId,
              message: payload.message
            });
          }
        } catch (err) {
          console.error('[Socket Chat] Failed to send chat notification:', err);
        }
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

    socket.on('call:initiate', (payload: { appointmentId: string; callerId: string; callerName: string; calleeId: string; callType: 'audio' | 'video' }) => {
      console.log(`[Socket Call] Initiate: ${payload.callerName} calling ${payload.calleeId} for appt ${payload.appointmentId} (${payload.callType})`);
      socket.to(payload.calleeId).emit('call:incoming', {
        appointmentId: payload.appointmentId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        callType: payload.callType
      });
    });

    socket.on('call:accept', (payload: { appointmentId: string; calleeId: string; callerId: string }) => {
      console.log(`[Socket Call] Accept: ${payload.calleeId} accepted call from ${payload.callerId}`);
      socket.to(payload.callerId).emit('call:accepted', {
        appointmentId: payload.appointmentId,
        calleeId: payload.calleeId
      });
    });

    socket.on('call:reject', (payload: { appointmentId: string; callerId: string }) => {
      console.log(`[Socket Call] Reject: call for appt ${payload.appointmentId} rejected by callee`);
      socket.to(payload.callerId).emit('call:rejected', {
        appointmentId: payload.appointmentId
      });
    });

    socket.on('call:hangup', (payload: { appointmentId: string; to?: string; targetId?: string }) => {
      const target = payload.to || payload.targetId;
      console.log(`[Socket Call] Hangup: call for appt ${payload.appointmentId} ended`);
      if (target) {
        socket.to(target).emit('call:hungup', {
          appointmentId: payload.appointmentId
        });
      }
    });

    socket.on('webrtc:signal', (payload: { appointmentId: string; to: string; signalData: any }) => {
      socket.to(payload.to).emit('webrtc:signal', {
        appointmentId: payload.appointmentId,
        signalData: payload.signalData,
        from: socket.id
      });
    });
  });

  return io;
};
