'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/app/auth/auth-context';
import { useToast } from '@/app/auth/toast-provider';

interface VideoConsultationProps {
  appointmentId: string;
  peerId: string;        // userId of the other party
  peerName: string;
  isCaller: boolean;
  /** Shared socket from CallOverlay. If provided, we reuse it instead of creating a new one. */
  sharedSocket?: Socket | null;
  onClose: () => void;
}

const getIceServers = (): RTCConfiguration => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_PASSWORD || process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl) {
    servers.push({ urls: turnUrl, username: turnUsername || '', credential: turnCredential || '' });
  }
  return { iceServers: servers };
};

export default function VideoConsultation({
  appointmentId,
  peerId,
  peerName,
  isCaller,
  sharedSocket,
  onClose,
}: VideoConsultationProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs
  const peerIdRef = useRef(peerId);
  const appointmentIdRef = useRef(appointmentId);
  const isCallerRef = useRef(isCaller);
  const candidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsRef = useRef<any[]>([]);
  const statusRef = useRef<'connecting' | 'connected' | 'ended'>('connecting');

  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);
  useEffect(() => { appointmentIdRef.current = appointmentId; }, [appointmentId]);
  useEffect(() => { isCallerRef.current = isCaller; }, [isCaller]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Cleanup — does NOT disconnect the shared socket ─────────────────────────
  const cleanup = useCallback((hangupSocket?: boolean) => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    candidatesQueueRef.current = [];
    pendingSignalsRef.current = [];
  }, []);

  const handleHangup = useCallback(() => {
    if (sharedSocket) {
      sharedSocket.emit('call:hangup', { appointmentId: appointmentIdRef.current, to: peerIdRef.current });
    }
    setStatus('ended');
    statusRef.current = 'ended';
    cleanup();
    setTimeout(() => {
      onCloseRef.current();
      if (user?.role === 'patient') {
        window.location.href = `/patient/appointments/${appointmentIdRef.current}`;
      }
    }, 1500);
  }, [sharedSocket, cleanup, user?.role]);

  // ── Process an incoming WebRTC signal ───────────────────────────────────────
  const processSignal = useCallback(async (signalData: any) => {
    const pc = pcRef.current;
    if (!pc) {
      pendingSignalsRef.current.push(signalData);
      return;
    }

    try {
      const { sdp, candidate } = signalData;
      if (sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        if (sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sharedSocket?.emit('webrtc:signal', {
            appointmentId: appointmentIdRef.current,
            to: peerIdRef.current,
            signalData: { sdp: answer },
          });
        }

        // Drain queued candidates
        while (candidatesQueueRef.current.length > 0) {
          const cand = candidatesQueueRef.current.shift();
          if (cand) { try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {} }
        }
      } else if (candidate) {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        } else {
          candidatesQueueRef.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[VideoConsultation] Signal error:', err);
    }
  }, [sharedSocket]);

  // ── Main session setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sharedSocket) return;

    const socket = sharedSocket;

    // ── Handle WebRTC signals forwarded to us ──
    const onSignal = (payload: { appointmentId: string; signalData: any; from: string }) => {
      // Only handle signals for this video session
      if (payload.appointmentId === appointmentIdRef.current) {
        processSignal(payload.signalData);
      }
    };

    // ── Handle remote hangup ──
    const onHungup = () => {
      if (statusRef.current === 'ended') return;
      showToastRef.current('Consultation ended.', 'info');
      setStatus('ended');
      statusRef.current = 'ended';
      cleanup();
      setTimeout(() => {
        onCloseRef.current();
        if (user?.role === 'patient') {
          window.location.href = `/patient/appointments/${appointmentIdRef.current}`;
        }
      }, 2000);
    };

    socket.on('webrtc:signal', onSignal);
    socket.on('call:hungup', onHungup);

    // ── Start media and WebRTC ──
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
            // Ensure video plays
            remoteVideoRef.current.play().catch(() => {});
            setStatus('connected');
            statusRef.current = 'connected';
            if (durationTimerRef.current) clearInterval(durationTimerRef.current);
            durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:signal', {
              appointmentId: appointmentIdRef.current,
              to: peerIdRef.current,
              signalData: { candidate: event.candidate },
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            console.warn('[VideoConsultation] ICE connection failed');
            showToastRef.current('Video connection failed. Please retry.', 'error');
          }
        };

        // Process any signals buffered before PC was created
        const buffered = [...pendingSignalsRef.current];
        pendingSignalsRef.current = [];
        for (const sig of buffered) {
          await processSignal(sig);
        }

        if (isCallerRef.current) {
          // Caller creates the offer
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:signal', {
            appointmentId: appointmentIdRef.current,
            to: peerIdRef.current,
            signalData: { sdp: offer },
          });
        }
        // If not caller: wait for offer from remote peer via webrtc:signal
      } catch (err) {
        console.error('[VideoConsultation] Media error:', err);
        showToastRef.current('Camera/Microphone access is required for video consultation.', 'error');
        cleanup();
        onCloseRef.current();
      }
    };

    startSession();

    const handleBeforeUnload = () => {
      try { socket.emit('call:hangup', { appointmentId: appointmentIdRef.current, to: peerIdRef.current }); } catch {}
      cleanup();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Remove only the listeners we added (don't disconnect shared socket)
      socket.off('webrtc:signal', onSignal);
      socket.off('call:hungup', onHungup);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, sharedSocket]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOff((v) => !v);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a', display: 'flex',
      flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: status === 'connected' ? '#22c55e' : status === 'ended' ? '#ef4444' : '#f59e0b',
            boxShadow: `0 0 8px ${status === 'connected' ? '#22c55e80' : '#f59e0b80'}`
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

      {/* ── Video area ── */}
      <div style={{ flex: 1, position: 'relative', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Remote video — always rendered so srcObject assignment works */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: status === 'connected' ? 'block' : 'none'
          }}
        />

        {/* Connecting / ended overlay */}
        {status !== 'connected' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38, color: '#fff', fontWeight: 700,
              boxShadow: '0 0 40px rgba(99,102,241,0.4)'
            }}>
              {peerName.charAt(0).toUpperCase()}
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 600 }}>{peerName}</div>
            {status === 'connecting' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
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

        {/* Local video (picture-in-picture) */}
        <div style={{
          position: 'absolute', bottom: 24, right: 24, width: 160, height: 120,
          borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)',
          background: '#1a1a2e', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          <video
            ref={localVideoRef}
            autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoOff ? 'none' : 'block' }}
          />
          {isVideoOff && (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: '#1a1a2e', color: '#6b7280', fontSize: 12
            }}>
              Camera Off
            </div>
          )}
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: '20px 24px', background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)'
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
            transition: 'background 0.2s, transform 0.1s', color: '#fff'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            {isMuted ? (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            ) : (
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
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
            transition: 'background 0.2s, transform 0.1s', color: '#fff'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            {isVideoOff ? (
              <path d="M21 6.5l-4-4-9.45 9.46-1.55-1.55L4.27 12.73 6 14.5l-4 4 1.41 1.41L21 8.5V6.5zm-10 1L9 9l-2-2-1.5 1.5 2 2L4 14h10l-3-3-2-2 2-1.5zm8 10.5H5c-1.1 0-2-.9-2-2V8h2v8h14v-8h2v8c0 1.1-.9 2-2 2z" />
            ) : (
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
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
            transition: 'transform 0.1s', transform: 'scale(1)'
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

      {/* CSS animation for connecting dots */}
      <style>{`
        @keyframes vcPulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
