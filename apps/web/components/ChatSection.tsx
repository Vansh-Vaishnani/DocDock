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
    <div
      className="flex flex-col h-[420px] sm:h-[550px] w-full overflow-hidden"
      style={{
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--card-bg)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', color: '#065f46' }}
            >
              {peerName.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ${isPeerOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
              style={{ '--tw-ring-color': 'var(--bg-secondary)' } as React.CSSProperties}
            />
          </div>
          <div>
            <h4 className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{peerName}</h4>
            <p className="text-[11px] font-medium" style={{ color: isPeerOnline ? '#10b981' : 'var(--text-muted)' }}>
              {isPeerOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat messages list */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: 'var(--bg-primary)' }}
      >
        {loadingHistory && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading history...</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === userId;
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={isOwn ? 'chat-bubble-out' : 'chat-bubble-in'}>
                {msg.type === 'text' && (
                  <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
                )}

                {msg.type === 'image' && msg.mediaUrl && (
                  <div className="space-y-1.5">
                    <img
                      src={msg.mediaUrl}
                      alt="Shared attachment"
                      className="max-w-full max-h-[220px] rounded-xl object-cover"
                    />
                    <a
                      href={msg.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[11px] font-semibold opacity-80 hover:opacity-100 underline"
                    >
                      View Original
                    </a>
                  </div>
                )}

                {(msg.type === 'prescription' || msg.type === 'document') && msg.mediaUrl && (
                  <div className="flex items-center gap-2.5 py-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {msg.type === 'prescription' ? (
                          <path d="M10.5 20.5L3 13l7.5-7.5 7.5 7.5-7.5 7.5z M14 6l6 6-6 6" />
                        ) : (
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">
                        {msg.type === 'prescription' ? 'Prescription.pdf' : 'Document.pdf'}
                      </p>
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold underline opacity-75 hover:opacity-100"
                      >
                        Download / View file
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] opacity-65">
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isOwn && (
                    <span>{msg.deliveryStatus === 'read' ? '✓✓' : '✓'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isPeerTyping && (
          <div className="flex justify-start">
            <div className="chat-bubble-in flex items-center gap-1.5 px-4 py-3">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input area */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
      >
        {!isActive ? (
          <div className="rounded-xl px-4 py-2.5 text-center text-xs font-semibold text-rose-500" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            Consultation completed — chat is now read-only.
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
              className="btn-icon flex-shrink-0 disabled:opacity-40"
              title="Attach File"
              aria-label="Attach file"
            >
              {uploadingFile ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend('text')}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              aria-label="Message input"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend('text')}
              disabled={!text.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 active:scale-95 hover:opacity-90"
              style={{ background: text.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-tertiary)', color: text.trim() ? 'white' : 'var(--text-muted)' }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
