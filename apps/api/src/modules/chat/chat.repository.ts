import { ChatMessageModel, IChatMessageDocument } from './chat.model';

export class ChatRepository {
  async createMessage(payload: {
    roomId: string;
    appointmentId: string;
    senderId: string;
    senderRole: 'patient' | 'doctor';
    type: 'text' | 'image';
    content?: string;
    mediaUrl?: string;
    isRead?: boolean;
    deliveryStatus?: 'sent' | 'delivered' | 'read';
  }): Promise<IChatMessageDocument> {
    return ChatMessageModel.create(payload);
  }

  async getMessages(roomId: string, page = 1, limit = 20): Promise<IChatMessageDocument[]> {
    return ChatMessageModel.find({ roomId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async markRead(roomId: string, senderId: string): Promise<void> {
    await ChatMessageModel.updateMany({ roomId, senderId: { $ne: senderId } }, { $set: { isRead: true, deliveryStatus: 'read' } });
  }
}
