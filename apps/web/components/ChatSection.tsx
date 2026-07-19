'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Message {
  _id: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  type: 'text' | 'image' | 'prescription' | 'document';
  content?: string;
  mediaUrl?: string;
  isRead: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

interface ChatSectionProps {
  appointmentId: string;
  roomId: string;
  senderRole: 'patient' | 'doctor';
  userId: string;
  peerName: string;
  isActive: boolean;
  onClose?: () => void;
}

export default function ChatSection({
  appointmentId,
  roomId,
  senderRole,
  userId,
  peerName,
  isActive,
  onClose
}: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
      if (!raw) return null;
      return (JSON.parse(raw) as { accessToken?: string }).accessToken || null;
    } catch {
      return null;
    }
  };

  const loadMessages = useCallback(async (pageNum: number, append = false) => {
    setLoadingHistory(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/chat/${roomId}/messages?page=${pageNum}&limit=30`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const newMsgs: Message[] = data.data?.messages || [];
        if (newMsgs.length < 30) {
          setHasMore(false);
        }
        setMessages((prev) => {
          if (append) {
            // Sort ascending by creation date
            const merged = [...newMsgs.reverse(), ...prev];
            // Deduplicate
            return merged.filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i);
          } else {
            return newMsgs.reverse();
          }
        });
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [roomId]);

  // Initial load and socket connect
  useEffect(() => {
    void loadMessages(1);

    const token = getStoredToken();
    if (!token) return;

    const socket = io(`${SOCKET_BASE}/chat`, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { roomId, userId });
      socket.emit('message:read', { roomId, userId });
      window.dispatchEvent(new CustomEvent('docdock:read_messages', {
        detail: { appointmentId }
      }));
    });

    socket.on('user:online', (payload: { userId: string }) => {
      if (payload.userId !== userId) {
        setIsPeerOnline(true);
      }
    });

    socket.on('message:receive', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      // If we are active window, send read receipt
      socket.emit('message:read', { roomId, userId });
      window.dispatchEvent(new CustomEvent('docdock:read_messages', {
        detail: { appointmentId }
      }));
    });

    socket.on('typing:start', (payload: { userId: string }) => {
      if (payload.userId !== userId) {
        setIsPeerTyping(true);
      }
    });

    socket.on('typing:stop', (payload: { userId: string }) => {
      if (payload.userId !== userId) {
        setIsPeerTyping(false);
      }
    });

    socket.on('message:read', (payload: { readerId: string }) => {
      if (payload.readerId !== userId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === userId ? { ...m, isRead: true, deliveryStatus: 'read' } : m))
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userId, loadMessages]);

  // Auto scroll to bottom — scoped strictly to the messages container
  // Does NOT use scrollIntoView (which would scroll the entire page)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Only auto-scroll if the user is within 150px of the bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isPeerTyping]);

  const handleSend = async (type: 'text' | 'image' | 'prescription' | 'document', mediaUrl?: string) => {
    if (!isActive) return;
    if (type === 'text' && !text.trim()) return;

    try {
      const token = getStoredToken();
      const payload = {
        appointmentId,
        type,
        content: type === 'text' ? text : undefined,
        mediaUrl
      };

      const res = await fetch(`${API_BASE}/chat/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const createdMsg = data.data;
        if (socketRef.current) {
          socketRef.current.emit('message:send', { roomId, message: createdMsg });
        }
        setText('');
        if (type === 'text') {
          // Trigger typing stop immediately
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (socketRef.current) {
            socketRef.current.emit('typing:stop', { roomId, userId });
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit('typing:start', { roomId, userId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing:stop', { roomId, userId });
        }
      }, 2000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isActive) return;

    setUploadingFile(true);
    try {
      const token = getStoredToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.data.url;

        // Determine message type
        let msgType: 'image' | 'prescription' | 'document' = 'document';
        if (file.type.startsWith('image/')) {
          msgType = 'image';
        } else if (file.name.toLowerCase().includes('prescription')) {
          msgType = 'prescription';
        }

        await handleSend(msgType, url);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !loadingHistory) {
      const nextPage = page + 1;
      setPage(nextPage);
      void loadMessages(nextPage, true);
    }
  };

  return (
    <div className="flex flex-col h-[420px] sm:h-[550px] w-full rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div>
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            {peerName}
            <span className={`inline-block h-2 w-2 rounded-full ${isPeerOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </h4>
          <p className="text-xs text-slate-500">{isPeerOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-200 text-slate-500 text-sm font-semibold transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Chat messages list */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
      >
        {loadingHistory && (
          <div className="text-center text-xs text-slate-400 py-1">Loading conversation history...</div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === userId;
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-[20px] px-4 py-2.5 text-sm shadow-sm ${
                  isOwn ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}
              >
                {msg.type === 'text' && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                {msg.type === 'image' && msg.mediaUrl && (
                  <div className="space-y-1">
                    <img
                      src={msg.mediaUrl}
                      alt="Shared attachment"
                      className="max-w-full max-h-[220px] rounded-lg object-cover"
                    />
                    <a
                      href={msg.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs font-semibold underline text-white hover:opacity-90"
                    >
                      View Original
                    </a>
                  </div>
                )}

                {(msg.type === 'prescription' || msg.type === 'document') && msg.mediaUrl && (
                  <div className="flex items-center gap-2 py-1">
                    <span className="text-lg">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">
                        {msg.type === 'prescription' ? 'Prescription.pdf' : 'Document.pdf'}
                      </p>
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold underline text-emerald-200"
                      >
                        Download / View file
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] opacity-75">
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isOwn && (
                    <span>{msg.deliveryStatus === 'read' ? '✓✓ Read' : '✓ Sent'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isPeerTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-500 rounded-[20px] rounded-tl-none px-4 py-2.5 text-xs italic shadow-sm animate-pulse">
              {peerName} is typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input area */}
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
        {!isActive ? (
          <div className="text-center text-xs font-semibold text-rose-500 py-2">
            This consultation has completed. Chat is now read-only.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf"
            />
            <button
              type="button"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-slate-200 p-2.5 hover:bg-slate-300 text-slate-600 disabled:opacity-50 transition"
              title="Attach File"
            >
              {uploadingFile ? '⏳' : '📎'}
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend('text')}
              placeholder="Type your message..."
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none text-slate-800"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend('text')}
              disabled={!text.trim()}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:opacity-55 transition"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
