'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/auth/auth-context';
import { useToast } from '@/app/auth/toast-provider';
import { useRouter } from 'next/navigation';

interface VideoConsultationProps {
  appointmentId: string;
  peerId: string;        // userId of the other party
  peerName: string;
  isCaller: boolean;
  onClose: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function VideoConsultation({
  appointmentId,
  peerId,
  peerName,
  isCaller,
  onClose
}: VideoConsultationProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const cleanup = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    if (socketRef.current) {
      try { socketRef.current.disconnect(); } catch (e) {}
      socketRef.current = null;
    }
  }, []);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const peerNameRef = useRef(peerName);
  peerNameRef.current = peerName;

  const handleHangup = useCallback(() => {
    socketRef.current?.emit('call:hangup', { appointmentId, to: peerId });
    setStatus('ended');
    cleanup();
    setTimeout(() => {
      onCloseRef.current();
      if (user?.role === 'patient') {
        window.location.href = `/patient/appointments/${appointmentId}`;
      }
    }, 1500);
  }, [appointmentId, peerId, cleanup, user?.role]);

  const candidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const getIceServers = () => {
    const servers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || (process.env as any).TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME || (process.env as any).TURN_USERNAME;
    const turnCredential = process.env.NEXT_PUBLIC_TURN_PASSWORD || process.env.NEXT_PUBLIC_TURN_CREDENTIAL || (process.env as any).TURN_PASSWORD || (process.env as any).TURN_CREDENTIAL;
    if (turnUrl) {
      servers.push({
        urls: turnUrl,
        username: turnUsername || '',
        credential: turnCredential || ''
      });
    }
    return { iceServers: servers };
  };

  useEffect(() => {
    if (!user) return;

    const token =
      typeof window !== 'undefined'
        ? (JSON.parse(localStorage.getItem('docdock-auth') || sessionStorage.getItem('docdock-auth') || '{}') as any)?.accessToken
        : null;

    const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
    const socket = io(`${SOCKET_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', user._id);
    });

    // Handle WebRTC signaling
    socket.on('webrtc:signal', async (payload: { signalData: any; from: string }) => {
      if (!pcRef.current) return;
      try {
        const { sdp, candidate } = payload.signalData;
        if (sdp) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          if (sdp.type === 'offer') {
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('webrtc:signal', {
              appointmentId,
              to: peerId,
              signalData: { sdp: answer }
            });
          }
          // Process queued candidates
          while (candidatesQueueRef.current.length > 0) {
            const cand = candidatesQueueRef.current.shift();
            if (cand) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (candidate) {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            candidatesQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('VideoConsultation signal error:', err);
      }
    });

    socket.on('call:hungup', () => {
      showToastRef.current(`Consultation ended.`, 'info');
      setStatus('ended');
      cleanup();
      setTimeout(() => {
        onCloseRef.current();
        if (user?.role === 'patient') {
          window.location.href = `/patient/appointments/${appointmentId}`;
        }
      }, 2000);
    });

    // Start media + WebRTC
    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection(getIceServers());
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('connected');
            if (durationTimerRef.current) clearInterval(durationTimerRef.current);
            durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:signal', {
              appointmentId,
              to: peerId,
              signalData: { candidate: event.candidate }
            });
          }
        };

        if (isCaller) {
          // Notify the peer first
          socket.emit('call:initiate', {
            appointmentId,
            callerId: user._id,
            callerName: user.fullName,
            calleeId: peerId,
            callType: 'video'
          });

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:signal', {
            appointmentId,
            to: peerId,
            signalData: { sdp: offer }
          });
        }
      } catch (err) {
        console.error('VideoConsultation media error:', err);
        showToastRef.current('Camera/Microphone access is required for video consultation.', 'error');
        cleanup();
        onCloseRef.current();
      }
    };

    startSession();

    // Tab close / refresh handler
    const handleBeforeUnload = () => {
      try {
        socket.emit('call:hangup', { appointmentId, to: peerId });
      } catch (e) {}
      cleanup();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [user?._id, appointmentId, peerId, isCaller, cleanup]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((v) => !v);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: status === 'connected' ? '#22c55e' : status === 'ended' ? '#ef4444' : '#f59e0b',
            boxShadow: `0 0 8px ${status === 'connected' ? '#22c55e' : '#f59e0b'}`
          }} />
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
              {status === 'connecting' ? 'Connecting...' : status === 'ended' ? 'Call Ended' : peerName}
            </div>
            {status === 'connected' && (
              <div style={{ color: '#86efac', fontSize: 12 }}>{formatDuration(duration)}</div>
            )}
          </div>
        </div>
        <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>
          Video Consultation · DocDock
        </div>
      </div>

      {/* Video Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: status === 'connected' ? 'block' : 'none'
          }}
        />

        {/* Connecting/Ended Overlay */}
        {status !== 'connected' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20
          }}>
            {/* Avatar */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38, color: '#fff', fontWeight: 700
            }}>
              {peerName.charAt(0).toUpperCase()}
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 600 }}>{peerName}</div>
            {status === 'connecting' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#6366f1',
                    animation: `vcPulse 1.4s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
            )}
            {status === 'ended' && (
              <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 500 }}>Call Ended</div>
            )}
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 160,
          height: 120,
          borderRadius: 12,
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.2)',
          background: '#1a1a2e',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoOff ? 'none' : 'block' }}
          />
          {isVideoOff && (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1a1a2e', color: '#6b7280', fontSize: 12
            }}>
              Camera Off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '20px 24px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Mute */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.12)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            color: '#fff',
            fontSize: 20
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            {isMuted ? (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            ) : (
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            )}
          </svg>
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.12)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            color: '#fff',
            fontSize: 20
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            {isVideoOff ? (
              <path d="M21 6.5l-4-4-9.45 9.46-1.55-1.55L4.27 12.73 6 14.5l-4 4 1.41 1.41L21 8.5V6.5zm-10 1L9 9l-2-2-1.5 1.5 2 2L4 14h10l-3-3-2-2 2-1.5zm8 10.5H5c-1.1 0-2-.9-2-2V8h2v8h14v-8h2v8c0 1.1-.9 2-2 2z"/>
            ) : (
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            )}
          </svg>
        </button>

        {/* Hangup */}
        <button
          onClick={handleHangup}
          title="End Call"
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
            transition: 'transform 0.1s',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
              transform="rotate(135 12 12)"
            />
          </svg>
        </button>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes vcPulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
