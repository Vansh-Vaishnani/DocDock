import { createServer } from 'http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { initializeSocketServer } from './gateway';

describe('Socket.IO Gateway Integration Suite', () => {
  let httpServer: any;
  let chatSocket: ClientSocket;
  let notificationSocket: ClientSocket | undefined = undefined;
  const port = 5099;

  beforeAll(async () => {
    httpServer = createServer();
    initializeSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  });

  afterAll(async () => {
    if (chatSocket?.connected) chatSocket.disconnect();
    if (notificationSocket?.connected) notificationSocket.disconnect();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('should connect to /chat namespace, join room and emit typing indicators', async () => {
    chatSocket = Client(`http://localhost:${port}/chat`, {
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      chatSocket.on('connect', () => resolve());
    });

    expect(chatSocket.connected).toBe(true);

    const roomId = 'appt123:patient1:doctor1';
    chatSocket.emit('join', { roomId, userId: 'patient1' });

    await new Promise<void>((resolve) => {
      chatSocket.emit('typing:start', { roomId, userId: 'patient1' });
      setTimeout(resolve, 50);
    });
  });

  it('should handle call initiation over /notifications namespace', async () => {
    const callerSocket = Client(`http://localhost:${port}/notifications`, {
      transports: ['websocket'],
    });
    const calleeSocket = Client(`http://localhost:${port}/notifications`, {
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((r) => callerSocket.on('connect', () => r())),
      new Promise<void>((r) => calleeSocket.on('connect', () => r())),
    ]);

    calleeSocket.emit('join', 'doc_user_99');

    const incomingCallPromise = new Promise<any>((resolve) => {
      calleeSocket.on('call:incoming', (data) => resolve(data));
    });

    callerSocket.emit('call:initiate', {
      appointmentId: 'appt_999',
      callerId: 'pat_user_1',
      callerName: 'John Patient',
      calleeId: 'doc_user_99',
      callType: 'video',
    });

    const incomingData = await incomingCallPromise;
    expect(incomingData).toEqual({
      appointmentId: 'appt_999',
      callerId: 'pat_user_1',
      callerName: 'John Patient',
      callType: 'video',
    });

    callerSocket.disconnect();
    calleeSocket.disconnect();
  });
});
