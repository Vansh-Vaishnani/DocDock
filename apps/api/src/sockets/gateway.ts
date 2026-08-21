import { Server as HttpServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import { config } from '../common/config';
import { AuthPayload } from '../common/middleware/authMiddleware';
import { ChatRepository } from '../modules/chat/chat.repository';
import { AppointmentModel } from '../modules/appointment/appointment.repository';
import { DoctorModel } from '../modules/doctor/doctor.repository';

const chatRepository = new ChatRepository();

let ioInstance: SocketIOServer | null = null;

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.io server not initialized');
  }
  return ioInstance;
};

/**
 * Verify JWT token from Socket.IO handshake auth or header query.
 */
function verifySocketToken(token?: string): AuthPayload | null {
  if (!token) return null;
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    return jwt.verify(cleanToken, config.jwtAccessSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export const initializeSocketServer = (server: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance = io;

  // ---------------------------------------------------------------------------
  // /tracking namespace — Room-based live location delivery
  // ---------------------------------------------------------------------------
  io.of('/tracking').on('connection', (socket) => {
    // Authenticate socket connection
    const token = (socket.handshake.auth?.token || socket.handshake.headers?.authorization || socket.handshake.query?.token) as string | undefined;
    const user = verifySocketToken(token);

    // Patient or doctor joins an appointment-specific tracking room
    socket.on('join:appointment', async (payload: { appointmentId: string; token?: string }) => {
      try {
        const appointmentId = payload.appointmentId;
        const activeUser = user || verifySocketToken(payload.token);

        if (!appointmentId) {
          socket.emit('error', { message: 'Appointment ID required', code: 'INVALID_PARAM' });
          return;
        }

        if (!activeUser) {
          socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
          return;
        }

        const appointment = await AppointmentModel.findById(appointmentId);
        if (!appointment) {
          socket.emit('error', { message: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' });
          return;
        }

        const userId = activeUser.sub;
        const patientUserId = appointment.patientId.toString();

        let isAuthorized = patientUserId === userId;
        if (!isAuthorized) {
          const doctor = await DoctorModel.findById(appointment.doctorId);
          if (doctor && doctor.userId.toString() === userId) {
            isAuthorized = true;
          }
        }
        if (!isAuthorized && activeUser.role === 'admin') {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          socket.emit('error', { message: 'Forbidden: You do not have access to this appointment room', code: 'FORBIDDEN' });
          return;
        }

        const room = `appointment:${appointmentId}`;
        socket.join(room);
        console.log(`[Socket /tracking] Socket ${socket.id} (User: ${userId}) joined room ${room}`);
        socket.emit('joined:appointment', { appointmentId, room });
      } catch (err) {
        console.error('[Socket /tracking] Join error:', err);
        socket.emit('error', { message: 'Internal error joining tracking room', code: 'INTERNAL_ERROR' });
      }
    });

    socket.on('heartbeat', (payload) => {
      socket.emit('heartbeat', payload);
    });
  });

  // ---------------------------------------------------------------------------
  // /chat namespace
  // ---------------------------------------------------------------------------
  io.of('/chat').on('connection', (socket) => {
    socket.on('join', (payload: { roomId: string; userId: string }) => {
      if (payload.roomId) {
        socket.join(payload.roomId);
        console.log(`Socket joined chat room: ${payload.roomId} (User: ${payload.userId})`);
        socket.to(payload.roomId).emit('user:online', { userId: payload.userId });
      }
    });

    socket.on('message:send', (payload: { roomId: string; message: Record<string, unknown> }) => {
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

  // ---------------------------------------------------------------------------
  // /availability namespace
  // ---------------------------------------------------------------------------
  io.of('/availability').on('connection', (socket) => {
    socket.on('availability:update', (payload) => {
      socket.broadcast.emit('availability:update', payload);
    });
  });

  // ---------------------------------------------------------------------------
  // /notifications namespace
  // ---------------------------------------------------------------------------
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

    socket.on('webrtc:signal', (payload: { appointmentId: string; to: string; signalData: unknown }) => {
      socket.to(payload.to).emit('webrtc:signal', {
        appointmentId: payload.appointmentId,
        signalData: payload.signalData,
        from: socket.id
      });
    });
  });

  return io;
};
