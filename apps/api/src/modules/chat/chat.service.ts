import { AppointmentModel } from '../appointment/appointment.repository';
import { ApiError } from '../../common/errors/ApiError';

import { ChatRepository } from './chat.repository';

export class ChatService {
  constructor(private readonly repository = new ChatRepository()) {}

  async getOrCreateRoom(appointmentId: string, userId: string) {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.patientId.toString() !== userId && appointment.doctorId.toString() !== userId) {
      throw new ApiError('Forbidden', 403, 'FORBIDDEN');
    }

    return {
      roomId: `${appointmentId}:${appointment.patientId}:${appointment.doctorId}`,
      appointmentId,
      isActive: true
    };
  }

  async getMessages(roomId: string, page = 1, limit = 20) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20;
    const messages = await this.repository.getMessages(roomId, safePage, safeLimit);
    return { roomId, messages };
  }

  async sendMessage(payload: {
    roomId: string;
    appointmentId: string;
    senderId: string;
    senderRole: 'patient' | 'doctor';
    type: 'text' | 'image';
    content?: string;
    mediaUrl?: string;
  }) {
    if (payload.type === 'image' && !payload.mediaUrl) {
      throw new ApiError('Media URL is required for image messages', 400, 'VALIDATION_ERROR');
    }
    if (payload.type === 'text' && !payload.content) {
      throw new ApiError('Message content is required', 400, 'VALIDATION_ERROR');
    }
    return this.repository.createMessage({ ...payload, deliveryStatus: 'sent' });
  }
}
